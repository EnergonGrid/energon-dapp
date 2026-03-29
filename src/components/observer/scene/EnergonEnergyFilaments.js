import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

const RARITY_COLORS = {
  Common: "#4FA3FF",
  Uncommon: "#00FFC6",
  Rare: "#8B5CFF",
  Epic: "#FF3B3B",
  Legendary: "#FF9F1C",
  Genesis: "#D9A441",
};

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

function buildCurvePointsA(from, to) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);

  const dir = end.clone().sub(start);
  const dist = dir.length();

  const lift = Math.max(0.18, dist * 0.18);
  const sideways = new THREE.Vector3(-dir.y, dir.x, 0)
    .normalize()
    .multiplyScalar(Math.min(0.22, dist * 0.06));

  const p1 = start
    .clone()
    .lerp(end, 0.3)
    .add(new THREE.Vector3(0, lift, 0))
    .add(sideways);

  const p2 = start
    .clone()
    .lerp(end, 0.7)
    .add(new THREE.Vector3(0, lift * 0.35, 0))
    .add(sideways.clone().multiplyScalar(0.35));

  const curve = new THREE.CatmullRomCurve3([start, p1, p2, end]);
  return curve.getPoints(72);
}

function buildCurvePointsB(from, to) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);

  const dir = end.clone().sub(start);
  const dist = dir.length();

  const lift = Math.max(0.12, dist * 0.11);
  const sideways = new THREE.Vector3(dir.y, -dir.x, 0)
    .normalize()
    .multiplyScalar(Math.min(0.34, dist * 0.09));

  const p1 = start
    .clone()
    .lerp(end, 0.24)
    .add(new THREE.Vector3(0, lift * 0.4, 0))
    .add(sideways);

  const p2 = start
    .clone()
    .lerp(end, 0.76)
    .add(new THREE.Vector3(0, -lift * 0.16, 0))
    .add(sideways.clone().multiplyScalar(0.55));

  const curve = new THREE.CatmullRomCurve3([start, p1, p2, end]);
  return curve.getPoints(72);
}

export default function EnergonEnergyFilaments({
  enabled = false,
  active = false,
  rarityTier = "Common",
  from = [0, 0, 0], // EnergonCube
  to = [1, 0, 0],   // Orb
  pulseSpeed = 0.4,
}) {
  const pulseForwardARef = useRef(null);
  const pulseForwardBRef = useRef(null);
  const pulseReturnARef = useRef(null);
  const pulseReturnBRef = useRef(null);

  const baseColor = useMemo(() => {
    const key = String(rarityTier);
    const hex = RARITY_COLORS[key] || RARITY_COLORS.Common;
    return new THREE.Color(hex);
  }, [rarityTier]);

  // Cube -> Orb = rarity color
  const filamentColorForward = useMemo(() => {
    return baseColor.clone().multiplyScalar(0.52);
  }, [baseColor]);

  // Orb -> Cube = soft cyan, except Genesis = soft gold
  const filamentColorReturn = useMemo(() => {
    if (String(rarityTier) === "Genesis") {
      return new THREE.Color("#FFE8A3").multiplyScalar(0.78);
    }
    return new THREE.Color("#9FFFE0").multiplyScalar(0.82);
  }, [rarityTier]);

  const linePointsA = useMemo(() => {
    return buildCurvePointsA(from, to);
  }, [from, to]);

  const linePointsB = useMemo(() => {
    return buildCurvePointsB(from, to);
  }, [from, to]);

  useFrame((state) => {
    if (!enabled || !active) return;

    const t = state.clock.getElapsedTime();
    const speed = Math.max(0.05, Number(pulseSpeed) || 0.4);

    // Forward: Cube -> Orb on first strand
    const forwardA = curvePoint(linePointsA, (t * speed) % 1);
    const forwardB = curvePoint(linePointsA, ((t * speed) + 0.38) % 1);

    // Return: Orb -> Cube on second strand
    const returnA = curvePoint(linePointsB, 1 - ((t * speed) % 1));
    const returnB = curvePoint(linePointsB, 1 - (((t * speed) + 0.44) % 1));

    if (pulseForwardARef.current) {
      pulseForwardARef.current.position.copy(forwardA);
    }

    if (pulseForwardBRef.current) {
      pulseForwardBRef.current.position.copy(forwardB);
    }

    if (pulseReturnARef.current) {
      pulseReturnARef.current.position.copy(returnA);
    }

    if (pulseReturnBRef.current) {
      pulseReturnBRef.current.position.copy(returnB);
    }
  });

  if (!enabled) return null;

  return (
    <group>
      {/* Forward strand: Cube -> Orb */}
      <Line
        points={linePointsA}
        color={filamentColorForward.getStyle()}
        transparent
        opacity={active ? 0.28 : 0.1}
        lineWidth={1.15}
      />

      {/* Return strand: Orb -> Cube */}
      <Line
        points={linePointsB}
        color={filamentColorReturn.getStyle()}
        transparent
        opacity={active ? 0.24 : 0.08}
        lineWidth={1.0}
      />

      {active ? (
        <>
          {/* Forward dots */}
          <mesh ref={pulseForwardARef}>
            <sphereGeometry args={[0.016, 16, 16]} />
            <meshBasicMaterial
              color={filamentColorForward.getStyle()}
              transparent
              opacity={0.82}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh ref={pulseForwardBRef}>
            <sphereGeometry args={[0.011, 14, 14]} />
            <meshBasicMaterial
              color={filamentColorForward.getStyle()}
              transparent
              opacity={0.5}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Return dots */}
          <mesh ref={pulseReturnARef}>
            <sphereGeometry args={[0.014, 16, 16]} />
            <meshBasicMaterial
              color={filamentColorReturn.getStyle()}
              transparent
              opacity={0.78}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh ref={pulseReturnBRef}>
            <sphereGeometry args={[0.01, 14, 14]} />
            <meshBasicMaterial
              color={filamentColorReturn.getStyle()}
              transparent
              opacity={0.42}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      ) : null}
    </group>
  );
}