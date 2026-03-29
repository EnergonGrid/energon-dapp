import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

// ✅ DEBUG / TUNING
const DEBUG_FORCE_VISIBLE_LANES = true;

// ✅ Lane event settings
const MAX_LANES = 5;
const LANE_MIN_DIST = 1.2;
const LANE_SPAWN_MIN = 0.45;
const LANE_SPAWN_MAX = 1.1;

// travel speed across curve
const TRAVEL_SPEED_MIN = 0.08;
const TRAVEL_SPEED_MAX = 0.16;

// how much of the already-traveled line remains visible
const TRAIL_LENGTH_MIN = 0.08;
const TRAIL_LENGTH_MAX = 0.18;

// visual size
const CORE_WIDTH = 2.4;
const GLOW_WIDTH = 5.4;
const PULSE_RADIUS = 0.045;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function curvePoint(points, t) {
  const safeT = Math.max(0, Math.min(0.999999, t));
  const scaled = safeT * (points.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;

  const a = points[idx];
  const b = points[Math.min(points.length - 1, idx + 1)];

  return new THREE.Vector3(
    a.x + (b.x - a.x) * frac,
    a.y + (b.y - a.y) * frac,
    a.z + (b.z - a.z) * frac
  );
}

function sliceCurve(points, tStart, tEnd) {
  const segments = 48;
  const out = [];

  const start = Math.max(0, Math.min(1, tStart));
  const end = Math.max(0, Math.min(1, tEnd));

  if (end <= start) return out;

  for (let i = 0; i <= segments; i++) {
    const t = start + (end - start) * (i / segments);
    out.push(curvePoint(points, t));
  }

  return out;
}

function makeCurve(from, to, bend = 0.28) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);

  const dir = end.clone().sub(start);
  const dist = dir.length();

  const mid = start.clone().lerp(end, 0.5);

  const perp = new THREE.Vector3(-dir.y, dir.x, 0);
  if (perp.lengthSq() < 0.00001) perp.set(0, 1, 0);
  perp.normalize();

  const lift = Math.max(0.14, Math.min(0.7, dist * 0.06));
  const sideways = perp.multiplyScalar(dist * bend * 0.12);

  const p1 = start
    .clone()
    .lerp(mid, 0.42)
    .add(new THREE.Vector3(0, lift, 0))
    .add(sideways);

  const p2 = mid
    .clone()
    .lerp(end, 0.58)
    .add(new THREE.Vector3(0, lift * 0.55, 0))
    .sub(sideways.clone().multiplyScalar(0.55));

  const curve = new THREE.CatmullRomCurve3([start, p1, p2, end]);
  return curve.getPoints(96);
}

function SectorLane({ lane, time }) {
  const pulseRef = useRef(null);

  const curvePoints = useMemo(() => {
    return makeCurve(lane.from, lane.to, lane.bend);
  }, [lane.from, lane.to, lane.bend]);

  const travelProgress = Math.max(0, (time - lane.startTime) * lane.speed);
  const headT = Math.min(1, travelProgress);
  const tailT = Math.max(0, headT - lane.trailLength);

  const visiblePoints = useMemo(() => {
    return sliceCurve(curvePoints, tailT, headT);
  }, [curvePoints, tailT, headT]);

  const alive = headT < 1.02;
  const fade =
    headT < 0.08 ? headT / 0.08 : headT > 0.92 ? Math.max(0, (1 - headT) / 0.08) : 1;

  useFrame(() => {
    if (!pulseRef.current || !alive) return;
    const p = curvePoint(curvePoints, Math.min(0.999, headT));
    pulseRef.current.position.copy(p);
  });

  if (!alive || visiblePoints.length < 2) return null;

  return (
    <group>
      <Line
        points={visiblePoints}
        color={"#ffffff"}
        transparent
        opacity={0.9 * fade}
        lineWidth={CORE_WIDTH}
      />

      <Line
        points={visiblePoints}
        color={"#7ddcff"}
        transparent
        opacity={0.32 * fade}
        lineWidth={GLOW_WIDTH}
      />

      <mesh ref={pulseRef}>
        <sphereGeometry args={[PULSE_RADIUS, 14, 14]} />
        <meshBasicMaterial
          color={"#ffffff"}
          transparent
          opacity={1 * fade}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function buildDebugEventLanes(now) {
  const z = 0.16;
  return [
    {
      id: `debug-a-${now}`,
      from: [-6.2, -1.2, z],
      to: [5.8, 1.4, z],
      startTime: now,
      speed: 0.11,
      trailLength: 0.12,
      bend: 0.24,
    },
    {
      id: `debug-b-${now}`,
      from: [-5.8, 2.6, z],
      to: [6.5, -2.2, z],
      startTime: now + 0.55,
      speed: 0.13,
      trailLength: 0.1,
      bend: 0.3,
    },
  ];
}

export default function SectorLanes({
  coherent = false,
  litPositions = null,
  seed = 1,
}) {
  const [lanes, setLanes] = useState([]);
  const timeRef = useRef(0);
  const randRef = useRef(mulberry32(seed));
  const nextSpawnRef = useRef(0);
  const debugBootstrappedRef = useRef(false);

  useEffect(() => {
    randRef.current = mulberry32(seed);
    nextSpawnRef.current = 0;
    setLanes([]);
    debugBootstrappedRef.current = false;
  }, [seed]);

  useEffect(() => {
    if (!coherent) {
      setLanes([]);
      debugBootstrappedRef.current = false;
      return;
    }

    if (!litPositions || litPositions.length < 30) {
      if (!DEBUG_FORCE_VISIBLE_LANES) {
        setLanes([]);
      }
    }
  }, [coherent, litPositions]);

  useFrame((state) => {
    timeRef.current = state.clock.getElapsedTime();
    const now = timeRef.current;

    if (!coherent) return;

    setLanes((prev) => {
      const alive = prev.filter((lane) => {
        const progress = (now - lane.startTime) * lane.speed;
        return progress < 1.05;
      });

      // ✅ always seed a couple of visible debug transmissions if wanted
      if (DEBUG_FORCE_VISIBLE_LANES && !debugBootstrappedRef.current) {
        debugBootstrappedRef.current = true;
        return [...alive, ...buildDebugEventLanes(now)];
      }

      if (alive.length >= MAX_LANES) return alive;
      if (now < nextSpawnRef.current) return alive;

      const rand = randRef.current;

      let chosen = null;

      if (litPositions && litPositions.length >= 30) {
        const pointCount = litPositions.length / 3;

        let tries = 0;
        while (tries < 32 && !chosen) {
          const aIdx = Math.floor(rand() * pointCount);
          const bIdx = Math.floor(rand() * pointCount);

          if (aIdx === bIdx) {
            tries += 1;
            continue;
          }

          const ax = litPositions[aIdx * 3];
          const ay = litPositions[aIdx * 3 + 1];
          const az = litPositions[aIdx * 3 + 2];

          const bx = litPositions[bIdx * 3];
          const by = litPositions[bIdx * 3 + 1];
          const bz = litPositions[bIdx * 3 + 2];

          const dx = bx - ax;
          const dy = by - ay;
          const dz = bz - az;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < LANE_MIN_DIST) {
            tries += 1;
            continue;
          }

          chosen = {
            id: `${now}-${aIdx}-${bIdx}`,
            from: [ax, ay, az + 0.16],
            to: [bx, by, bz + 0.16],
            startTime: now,
            speed: TRAVEL_SPEED_MIN + rand() * (TRAVEL_SPEED_MAX - TRAVEL_SPEED_MIN),
            trailLength:
              TRAIL_LENGTH_MIN + rand() * (TRAIL_LENGTH_MAX - TRAIL_LENGTH_MIN),
            bend: 0.18 + rand() * 0.26,
          };
        }
      }

      nextSpawnRef.current = now + LANE_SPAWN_MIN + rand() * (LANE_SPAWN_MAX - LANE_SPAWN_MIN);

      return chosen ? [...alive, chosen] : alive;
    });
  });

  if (!coherent || lanes.length === 0) return null;

  return (
    <>
      {lanes.map((lane) => (
        <SectorLane key={lane.id} lane={lane} time={timeRef.current} />
      ))}
    </>
  );
}