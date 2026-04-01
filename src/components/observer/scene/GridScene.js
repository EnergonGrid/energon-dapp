import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ===============================
   CONFIG
================================= */

const MAX_VISIBLE_ACTIVE = 15000;
const SHOW_GRID_TESTER = false;
const GRID_TEST_COUNTS = [
  1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1000, 2000, 5000,
];
const ACTIVE_TEST_OVERRIDE = null;

// tester helper
const TEST_FRONT_HEMISPHERE_ONLY = true;

const MOBILE_BREAKPOINT = 820;

const DESKTOP_GLOBE_RADIUS = 2.15;
const MOBILE_GLOBE_RADIUS = 1.25;

const DESKTOP_NODE_ALTITUDE = 0.075;
const MOBILE_NODE_ALTITUDE = 0.055;

// thick-shell depth so nodes can exist inside the globe body
const DESKTOP_SHELL_DEPTH = 0.32;
const MOBILE_SHELL_DEPTH = 0.14;

const DESKTOP_ACTIVE_DOT_BASE_SIZE = 10.5;
const DESKTOP_ACTIVE_DOT_PULSE_SIZE = 7.2;
const MOBILE_ACTIVE_DOT_BASE_SIZE = 4.8;
const MOBILE_ACTIVE_DOT_PULSE_SIZE = 1.6;

// identity node
const DESKTOP_IDENTITY_BASE_SIZE = 16.0;
const DESKTOP_IDENTITY_PULSE_SIZE = 10.0;
const MOBILE_IDENTITY_BASE_SIZE = 9.5;
const MOBILE_IDENTITY_PULSE_SIZE = 5.5;

const MAX_SUPPLY = 1000000;

// local-neighbor relay mode
const MAX_RENDERED_RELAYS = 5000;
const RELAY_LOCAL_CONNECTIONS = 1;
const RELAY_MAX_DISTANCE_DESKTOP = 1.15;
const RELAY_MAX_DISTANCE_MOBILE = 0.88;

const RELAY_CURVE_HEIGHT_DESKTOP = 0.16;
const RELAY_CURVE_HEIGHT_MOBILE = 0.11;

// identity relays
const IDENTITY_RELAY_CONNECTIONS = 5;
const IDENTITY_RELAY_MAX_DISTANCE_DESKTOP = 3.05;
const IDENTITY_RELAY_MAX_DISTANCE_MOBILE = 2.45;

const IDENTITY_RELAY_CURVE_HEIGHT_DESKTOP = 0.50;
const IDENTITY_RELAY_CURVE_HEIGHT_MOBILE = 0.42;

/* ===============================
   RARITY / IDENTITY COLORS
================================= */

const RARITY_COLORS = {
  Common: "#4FA3FF",
  Uncommon: "#00FFC6",
  Rare: "#8B5CFF",
  Epic: "#FF3B3B",
  Legendary: "#FF9F1C",
  Genesis: "#FFE600",
};

function getIdentityColor(rarity) {
  return RARITY_COLORS[String(rarity || "Common")] || RARITY_COLORS.Common;
}

/* ===============================
   HASH / RNG
================================= */

function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

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

/* ===============================
   LIVE SAMPLE MAPPING
================================= */

function resolveVisibleNodeCount(totalMinted) {
  const live = Math.max(0, Math.floor(Number(totalMinted) || 0));

  if (live <= 2000) return live;
  if (live <= 5000) return 5000;
  if (live <= 10000) return 10000;
  return 15000;
}

/* ===============================
   LABEL SPRITE
================================= */

function makeLabelTexture(text, opts = {}) {
  const {
    width = 512,
    height = 128,
    fontSize = 40,
    color = "#FFFFFF",
    background = "rgba(0,0,0,0)",
    border = null,
    radius = 18,
    bold = false,
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  if (background !== "rgba(0,0,0,0)" || border) {
    const x = 4;
    const y = 4;
    const w = width - 8;
    const h = height - 8;
    const r = Math.min(radius, w / 2, h / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();

    ctx.fillStyle = background;
    ctx.fill();

    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  ctx.fillStyle = color;
  ctx.font = `${bold ? "700" : "500"} ${fontSize}px Inter, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function LabelSprite({
  text,
  position = [0, 0, 0],
  scale = [1, 0.24, 1],
  color = "#FFFFFF",
  background = "rgba(0,0,0,0)",
  border = null,
  fontSize = 40,
  bold = false,
}) {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return makeLabelTexture(text, {
      color,
      background,
      border,
      fontSize,
      bold,
    });
  }, [text, color, background, border, fontSize, bold]);

  useEffect(() => {
    return () => {
      if (texture) texture.dispose();
    };
  }, [texture]);

  if (!texture) return null;

  return (
    <sprite position={position} scale={scale}>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </sprite>
  );
}

/* ===============================
   SPHERE DISTRIBUTION
================================= */

function generateSpherePoints(
  count,
  seed,
  radius,
  altitude,
  frontOnly = false,
  shellDepth = 0.42
) {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);

  let written = 0;

  while (written < count) {
    const u = rand();
    const v = rand();

    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const shellT = Math.pow(rand(), 1.6);
    const r = radius + altitude - shellT * shellDepth;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    if (frontOnly && z < 0) continue;

    const i = written * 3;
    positions[i] = x;
    positions[i + 1] = y;
    positions[i + 2] = z;

    written += 1;
  }

  return positions;
}

function generateIdentityPoint(
  seed,
  radius,
  altitude,
  frontOnly = false,
  shellDepth = 0.42
) {
  const rand = mulberry32(seed);

  // controlled visible randomness window
  // horizontal spread
  const thetaMin = -Math.PI * 0.70;
  const thetaMax = -Math.PI * 0.20;

  // vertical spread
  const phiMin = Math.PI * -0.20;
  const phiMax = Math.PI * 0.20;

  const theta = thetaMin + rand() * (thetaMax - thetaMin);
  const phi = phiMin + rand() * (phiMax - phiMin);

  const shellT = 0.10 + rand() * 0.05;
  const r = radius + altitude - shellT * shellDepth;

  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);

  if (frontOnly && z < 0) {
    return new Float32Array([x, y, Math.abs(z)]);
  }

  return new Float32Array([x, y, z]);
}

function sqDist3(ax, ay, az, bx, by, bz) {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return dx * dx + dy * dy + dz * dz;
}

/* ===============================
   LOCAL-ONLY RELAYS
================================= */

function buildLocalRelayEdges(positions, activeCount, maxDistance, seed) {
  if (!positions || activeCount <= 1) return [];

  const rand = mulberry32(seed ^ 0xa341316c);
  const edges = [];
  const edgeSet = new Set();
  const maxDistSq = maxDistance * maxDistance;

  function edgeKey(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return `${lo}:${hi}`;
  }

  function tryAddEdge(a, b) {
    if (a === b) return false;
    const key = edgeKey(a, b);
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    edges.push([a, b]);
    return true;
  }

  for (let i = 0; i < activeCount; i++) {
    if (edges.length >= MAX_RENDERED_RELAYS) break;

    const candidates = [];

    const ix = positions[i * 3];
    const iy = positions[i * 3 + 1];
    const iz = positions[i * 3 + 2];

    for (let j = 0; j < activeCount; j++) {
      if (j === i) continue;

      const d = sqDist3(
        ix,
        iy,
        iz,
        positions[j * 3],
        positions[j * 3 + 1],
        positions[j * 3 + 2]
      );

      if (d <= maxDistSq) {
        candidates.push([j, d]);
      }
    }

    if (!candidates.length) continue;

    candidates.sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1];
      return rand() - 0.5;
    });

    let added = 0;
    for (
      let k = 0;
      k < candidates.length && added < RELAY_LOCAL_CONNECTIONS;
      k++
    ) {
      const j = candidates[k][0];
      if (tryAddEdge(i, j)) added += 1;
      if (edges.length >= MAX_RENDERED_RELAYS) break;
    }
  }

  return edges;
}

function buildIdentityRelayTargets(
  identityPosition,
  positions,
  activeCount,
  maxDistance,
  maxTargets = 2
) {
  if (!identityPosition || !positions || activeCount <= 0) return [];

  const candidates = [];
  const maxDistSq = maxDistance * maxDistance;

  const ix = identityPosition[0];
  const iy = identityPosition[1];
  const iz = identityPosition[2];

  for (let i = 0; i < activeCount; i++) {
    const px = positions[i * 3];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2];

    const d = sqDist3(ix, iy, iz, px, py, pz);
    if (d <= maxDistSq) {
      candidates.push([i, d]);
    }
  }

  candidates.sort((a, b) => a[1] - b[1]);

if (candidates.length === 0) return [];

// split into distance tiers
const near = candidates.slice(0, Math.floor(candidates.length * 0.2));
const mid = candidates.slice(
  Math.floor(candidates.length * 0.3),
  Math.floor(candidates.length * 0.6)
);
const far = candidates.slice(Math.floor(candidates.length * 0.7));

// pick from each tier
const selected = [];

if (near.length) selected.push(near[0][0]);
if (mid.length) selected.push(mid[0][0]);
if (far.length) selected.push(far[0][0]);

// fallback if not enough
for (let i = 0; selected.length < maxTargets && i < candidates.length; i++) {
  const idx = candidates[i][0];
  if (!selected.includes(idx)) {
    selected.push(idx);
  }
}

return selected.slice(0, maxTargets);
}

/* ===============================
   GLOBE — STATIC
================================= */

function GlobeShell({ radius, rotationRef }) {
  const groupRef = useRef(null);

  const globeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: new THREE.Vector3(-0.9, 0.18, 0.38).normalize() },
        uNightColor: { value: new THREE.Color("#020409") },
        uDayColor: { value: new THREE.Color("#1A2433") },
        uBlueTint: { value: new THREE.Color("#3D7BFF") },
      },
      vertexShader: `
        varying vec3 vNormalW;

        void main() {
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uNightColor;
        uniform vec3 uDayColor;
        uniform vec3 uBlueTint;

        varying vec3 vNormalW;

        void main() {
          vec3 n = normalize(vNormalW);
          vec3 l = normalize(uSunDir);

          float ndl = dot(n, l);

          float day = smoothstep(-0.20, 0.16, ndl);
          float litCore = smoothstep(-0.10, 0.85, ndl);

          float terminator = 1.0 - abs(smoothstep(-0.08, 0.08, ndl) - 0.5) * 2.0;
          terminator = pow(max(terminator, 0.0), 1.8);

          vec3 color = mix(uNightColor, uDayColor, day);
          color += uBlueTint * day * 0.06;
          color += vec3(0.05, 0.08, 0.12) * litCore * 0.35;
          color += uBlueTint * terminator * 0.025;

          gl_FragColor = vec4(color, 0.985);
        }
      `,
      transparent: true,
      depthWrite: true,
    });
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = 0;
    rotationRef.current = 0;
  });

  useEffect(() => {
    return () => {
      globeMat.dispose();
    };
  }, [globeMat]);

  return (
    <group ref={groupRef} position={[0, 0, -3]}>
      <mesh>
        <sphereGeometry args={[radius, 96, 96]} />
        <primitive object={globeMat} attach="material" />
      </mesh>
    </group>
  );
}

/* ===============================
   ACTIVE DOTS
================================= */

function ActiveWalletDots({
  positions,
  nodePulseRef,
  rotationRef,
  baseSize,
  pulseSize,
}) {
  const geomRef = useRef(null);
  const matRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    if (!geomRef.current) return;

    const geom = geomRef.current;
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const count = positions.length / 3;
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      phase[i] = Math.random() * Math.PI * 2;
    }
    geom.setAttribute("phase", new THREE.BufferAttribute(phase, 1));
    geom.computeBoundingSphere();
  }, [positions]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseSize: { value: baseSize },
        uPulseSize: { value: pulseSize },
        uColor: { value: new THREE.Color("#E6F1FF") },
        uNodePulseTex: { value: null },
        uNodeCount: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        uniform float uBaseSize;
        uniform float uPulseSize;
        uniform sampler2D uNodePulseTex;
        uniform float uNodeCount;

        attribute float phase;
        varying float vAlpha;

        float readPulse(float idx) {
          if (uNodeCount <= 0.0) return 0.0;
          float x = (idx + 0.5) / uNodeCount;
          return texture2D(uNodePulseTex, vec2(x, 0.5)).r;
        }

        void main() {
          float baseTwinkle = 0.5 + 0.5 * sin(uTime * 1.3 + phase);
          float idx = float(gl_VertexID);
          float nodePulse = readPulse(idx);

          float pulse = max(baseTwinkle * 0.25, nodePulse);
          vAlpha = 0.40 + pulse * 0.60;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = uBaseSize + uPulseSize * pulse;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float r = length(c);
          if (r > 0.5) discard;

          float glow = smoothstep(0.5, 0.0, r);
          glow = pow(glow, 1.8);

          float alpha = vAlpha * glow;
          gl_FragColor = vec4(uColor * 1.85, alpha * 1.35);
        }
      `,
    });
  }, [baseSize, pulseSize]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = 0;
      groupRef.current.position.z = -3;
    }

    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();

    if (nodePulseRef.current?.texture) {
      matRef.current.uniforms.uNodePulseTex.value =
        nodePulseRef.current.texture;
      matRef.current.uniforms.uNodeCount.value = nodePulseRef.current.count;
    }
  });

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <group ref={groupRef}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geomRef} />
        <primitive ref={matRef} object={material} attach="material" />
      </points>
    </group>
  );
}

/* ===============================
   CONNECTED WALLET IDENTITY NODE
================================= */

function IdentityNode({
  position,
  rotationRef,
  rarityColor,
  coherent,
  isMobile,
  isGenesis,
  totalMinted,
}) {
  const groupRef = useRef(null);
  const pointGeomRef = useRef(null);
  const auraGeomRef = useRef(null);

  useEffect(() => {
    if (pointGeomRef.current) {
      pointGeomRef.current.setAttribute(
        "position",
        new THREE.BufferAttribute(position, 3)
      );
      pointGeomRef.current.computeBoundingSphere();
    }
    if (auraGeomRef.current) {
      auraGeomRef.current.setAttribute(
        "position",
        new THREE.BufferAttribute(position, 3)
      );
      auraGeomRef.current.computeBoundingSphere();
    }
  }, [position]);

  const baseColor = useMemo(() => new THREE.Color(rarityColor), [rarityColor]);

  const mintProgress = useMemo(() => {
    const minted = Math.max(0, Number(totalMinted) || 0);
    const cap = Math.max(1, Number(MAX_SUPPLY) || 1);
    return Math.min(1, minted / cap);
  }, [totalMinted]);

  const colorProgress = useMemo(() => {
    return Math.pow(mintProgress, 0.72);
  }, [mintProgress]);

  const identityMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseSize: {
          value: isMobile
            ? MOBILE_IDENTITY_BASE_SIZE
            : DESKTOP_IDENTITY_BASE_SIZE,
        },
        uPulseSize: {
          value: isMobile
            ? MOBILE_IDENTITY_PULSE_SIZE
            : DESKTOP_IDENTITY_PULSE_SIZE,
        },
        uBaseColor: { value: baseColor.clone() },
        uPulseColor: { value: new THREE.Color("#F4FAFF") },
        uDormantColor: { value: new THREE.Color("#000000") },
        uCoherent: { value: coherent ? 1 : 0 },
        uGenesis: { value: isGenesis ? 1 : 0 },
        uColorProgress: { value: colorProgress },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        uniform float uBaseSize;
        uniform float uPulseSize;
        uniform float uCoherent;

        varying float vPulse;
        varying float vAlpha;

        void main() {
          float slowBeat = 0.5 + 0.5 * sin(uTime * (uCoherent > 0.5 ? 2.15 : 0.8));
          float guardianPulse = pow(slowBeat, 1.45);

          vPulse = guardianPulse;
          vAlpha = 0.72 + guardianPulse * 0.28;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = uBaseSize + uPulseSize * guardianPulse;
        }
      `,
      fragmentShader: `
        uniform vec3 uBaseColor;
        uniform vec3 uPulseColor;
        uniform vec3 uDormantColor;
        uniform float uGenesis;
        uniform float uTime;
        uniform float uColorProgress;

        varying float vPulse;
        varying float vAlpha;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float r = length(c);
          if (r > 0.5) discard;

          float glow = smoothstep(0.5, 0.0, r);
          glow = pow(glow, 1.35);

          vec3 finalColor;

          if (uGenesis > 0.5) {
            float t = uTime * 0.6;
            float cycle = mod(t, 7.0);
            float idx = floor(cycle);
            float mixT = fract(cycle);

            vec3 c0;
            vec3 c1;

            if (idx < 1.0) {
              c0 = vec3(0.31, 0.64, 1.0);
              c1 = vec3(0.0, 1.0, 0.78);
            } else if (idx < 2.0) {
              c0 = vec3(0.0, 1.0, 0.78);
              c1 = vec3(0.18, 1.0, 0.34);
            } else if (idx < 3.0) {
              c0 = vec3(0.18, 1.0, 0.34);
              c1 = vec3(1.0, 0.9, 0.0);
            } else if (idx < 4.0) {
              c0 = vec3(1.0, 0.9, 0.0);
              c1 = vec3(1.0, 0.62, 0.11);
            } else if (idx < 5.0) {
              c0 = vec3(1.0, 0.62, 0.11);
              c1 = vec3(1.0, 0.23, 0.23);
            } else if (idx < 6.0) {
              c0 = vec3(1.0, 0.23, 0.23);
              c1 = vec3(0.55, 0.36, 1.0);
            } else {
              c0 = vec3(0.55, 0.36, 1.0);
              c1 = vec3(0.31, 0.64, 1.0);
            }

            vec3 rainbow = mix(c0, c1, mixT);
            finalColor = mix(rainbow, vec3(1.0), vPulse * 0.35);
          } else {
            vec3 currentCoreColor = mix(uDormantColor, uBaseColor, uColorProgress);
            finalColor = mix(currentCoreColor, uPulseColor, vPulse * 0.35);
          }

          float alpha = vAlpha * glow * 1.18;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });
  }, [baseColor, coherent, colorProgress, isGenesis, isMobile]);

  const auraMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: baseColor.clone() },
        uDormantColor: { value: new THREE.Color("#2A4266") },
        uCoherent: { value: coherent ? 1 : 0 },
        uGenesis: { value: isGenesis ? 1 : 0 },
        uColorProgress: { value: colorProgress },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        uniform float uCoherent;
        varying float vPulse;

        void main() {
          float beat = 0.5 + 0.5 * sin(uTime * (uCoherent > 0.5 ? 1.7 : 0.6));
          vPulse = pow(beat, 1.8);

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = ${isMobile ? "20.0" : "34.0"} + vPulse * ${
            isMobile ? "8.0" : "16.0"
          };
        }
      `,
      fragmentShader: `
        uniform vec3 uBaseColor;
        uniform vec3 uDormantColor;
        uniform float uGenesis;
        uniform float uTime;
        uniform float uColorProgress;
        varying float vPulse;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float r = length(c);
          if (r > 0.5) discard;

          float halo = smoothstep(0.5, 0.0, r);
          halo = pow(halo, 2.8);

          vec3 finalColor;

          if (uGenesis > 0.5) {
            float t = uTime * 0.6;
            float cycle = mod(t, 7.0);
            float idx = floor(cycle);
            float mixT = fract(cycle);

            vec3 c0;
            vec3 c1;

            if (idx < 1.0) {
              c0 = vec3(0.31, 0.64, 1.0);
              c1 = vec3(0.0, 1.0, 0.78);
            } else if (idx < 2.0) {
              c0 = vec3(0.0, 1.0, 0.78);
              c1 = vec3(0.18, 1.0, 0.34);
            } else if (idx < 3.0) {
              c0 = vec3(0.18, 1.0, 0.34);
              c1 = vec3(1.0, 0.9, 0.0);
            } else if (idx < 4.0) {
              c0 = vec3(1.0, 0.9, 0.0);
              c1 = vec3(1.0, 0.62, 0.11);
            } else if (idx < 5.0) {
              c0 = vec3(1.0, 0.62, 0.11);
              c1 = vec3(1.0, 0.23, 0.23);
            } else if (idx < 6.0) {
              c0 = vec3(1.0, 0.23, 0.23);
              c1 = vec3(0.55, 0.36, 1.0);
            } else {
              c0 = vec3(0.55, 0.36, 1.0);
              c1 = vec3(0.31, 0.64, 1.0);
            }

            finalColor = mix(c0, c1, mixT);
          } else {
            finalColor = mix(uDormantColor, uBaseColor, uColorProgress);
          }

          float alpha = (0.04 + vPulse * 0.05) * halo;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });
  }, [baseColor, coherent, colorProgress, isGenesis, isMobile]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = 0;
      groupRef.current.position.z = -3;
    }

    const t = state.clock.getElapsedTime();
    identityMaterial.uniforms.uTime.value = t;
    auraMaterial.uniforms.uTime.value = t;
  });

  useEffect(() => {
    return () => {
      identityMaterial.dispose();
      auraMaterial.dispose();
    };
  }, [identityMaterial, auraMaterial]);

  return (
    <group ref={groupRef}>
      <points frustumCulled={false}>
        <bufferGeometry ref={auraGeomRef} />
        <primitive object={auraMaterial} attach="material" />
      </points>
      <points frustumCulled={false}>
        <bufferGeometry ref={pointGeomRef} />
        <primitive object={identityMaterial} attach="material" />
      </points>
    </group>
  );
}

/* ===============================
   RELAYS + SIGNALS
================================= */

function RelayLinesAndSignals({
  positions,
  edges,
  nodePulseRef,
  rotationRef,
  curveHeight,
  isMobile,
}) {
  const lineGeomRef = useRef(null);
  const lineMatRef = useRef(null);
  const signalGeomRef = useRef(null);
  const signalMatRef = useRef(null);
  const lineGroupRef = useRef(null);
  const signalGroupRef = useRef(null);

  const edgeMetaRef = useRef([]);

  useEffect(() => {
    const count = edges.length;

    if (nodePulseRef.current?.texture) {
      nodePulseRef.current.texture.dispose();
      nodePulseRef.current.texture = null;
    }

    if (!count) {
      if (nodePulseRef.current) {
        const countNodes = positions.length / 3;
        nodePulseRef.current.count = countNodes;
        nodePulseRef.current.data = new Float32Array(countNodes);
        nodePulseRef.current.texture = new THREE.DataTexture(
          nodePulseRef.current.data,
          Math.max(1, countNodes),
          1,
          THREE.RedFormat,
          THREE.FloatType
        );
        nodePulseRef.current.texture.needsUpdate = true;
      }
      return;
    }

    const segmentsPerEdge = 16;
    const linePositions = new Float32Array(
      count * (segmentsPerEdge - 1) * 2 * 3
    );
    const signalPositions = new Float32Array(count * 3);
    const meta = [];

    let lp = 0;

    for (let i = 0; i < count; i++) {
      const [aIdx, bIdx] = edges[i];

      const a = new THREE.Vector3(
        positions[aIdx * 3],
        positions[aIdx * 3 + 1],
        positions[aIdx * 3 + 2]
      );

      const b = new THREE.Vector3(
        positions[bIdx * 3],
        positions[bIdx * 3 + 1],
        positions[bIdx * 3 + 2]
      );

      const mid = a
        .clone()
        .add(b)
        .multiplyScalar(0.5)
        .normalize()
        .multiplyScalar(a.length() + curveHeight);

      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const pts = curve.getPoints(segmentsPerEdge - 1);

      for (let s = 0; s < pts.length - 1; s++) {
        linePositions[lp++] = pts[s].x;
        linePositions[lp++] = pts[s].y;
        linePositions[lp++] = pts[s].z;

        linePositions[lp++] = pts[s + 1].x;
        linePositions[lp++] = pts[s + 1].y;
        linePositions[lp++] = pts[s + 1].z;
      }

      signalPositions[i * 3] = a.x;
      signalPositions[i * 3 + 1] = a.y;
      signalPositions[i * 3 + 2] = a.z;

      meta.push({
        aIdx,
        bIdx,
        curve,
        duration: 1.8 + (i % 5) * 0.22,
        phase: (i * 0.173) % 1,
      });
    }

    edgeMetaRef.current = meta;

    if (lineGeomRef.current) {
      lineGeomRef.current.setAttribute(
        "position",
        new THREE.BufferAttribute(linePositions, 3)
      );
      lineGeomRef.current.computeBoundingSphere();
    }

    if (signalGeomRef.current) {
      signalGeomRef.current.setAttribute(
        "position",
        new THREE.BufferAttribute(signalPositions, 3)
      );
      signalGeomRef.current.computeBoundingSphere();
    }

    if (nodePulseRef.current) {
      const countNodes = positions.length / 3;
      nodePulseRef.current.count = countNodes;
      nodePulseRef.current.data = new Float32Array(countNodes);
      nodePulseRef.current.texture = new THREE.DataTexture(
        nodePulseRef.current.data,
        Math.max(1, countNodes),
        1,
        THREE.RedFormat,
        THREE.FloatType
      );
      nodePulseRef.current.texture.needsUpdate = true;
    }
  }, [positions, edges, nodePulseRef, curveHeight]);

  useFrame((state, delta) => {
    if (lineGroupRef.current) {
      lineGroupRef.current.rotation.y = 0;
      lineGroupRef.current.position.z = -3;
    }
    if (signalGroupRef.current) {
      signalGroupRef.current.rotation.y = 0;
      signalGroupRef.current.position.z = -3;
    }

    const signalGeom = signalGeomRef.current;
    const signalMat = signalMatRef.current;
    const lineMat = lineMatRef.current;
    const nodePulse = nodePulseRef.current;

    if (!nodePulse?.data) return;

    const pulses = nodePulse.data;
    for (let i = 0; i < pulses.length; i++) {
      pulses[i] = Math.max(0, pulses[i] - delta * 1.8);
    }

    if (!signalGeom || !signalMat || !lineMat || !edges.length) {
      if (nodePulse.texture) nodePulse.texture.needsUpdate = true;
      return;
    }

    const t = state.clock.getElapsedTime();
    const posAttr = signalGeom.getAttribute("position");
    const arr = posAttr.array;

    const meta = edgeMetaRef.current;
    for (let i = 0; i < meta.length; i++) {
      const m = meta[i];
      const progress = ((t / m.duration) + m.phase) % 1;
      const p = m.curve.getPoint(progress);

      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;

      if (progress > 0.94) {
        pulses[m.bIdx] = Math.max(pulses[m.bIdx], 1.0);
      }
    }

    posAttr.needsUpdate = true;
    nodePulse.texture.needsUpdate = true;

    signalMat.uniforms.uTime.value = t;
    lineMat.uniforms.uTime.value = t;
  });

  const lineMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#CFE6FF") },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying float vAlpha;

        void main() {
          vAlpha = 1.0;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          float intensity = 0.6 + 0.4 * vAlpha;
          gl_FragColor = vec4(uColor * 1.6 * intensity, 0.22);
        }
      `,
    });
  }, []);

  const signalMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#F5FAFF") },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = ${isMobile ? "5.4" : "7.6"};
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float r = length(c);
          if (r > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, r);
          gl_FragColor = vec4(uColor, 0.90 * glow);
        }
      `,
    });
  }, [isMobile]);

  useEffect(() => {
    return () => {
      lineMaterial.dispose();
      signalMaterial.dispose();
    };
  }, [lineMaterial, signalMaterial]);

  if (!edges.length) return null;

  return (
    <>
      <group ref={lineGroupRef}>
        <lineSegments frustumCulled={false}>
          <bufferGeometry ref={lineGeomRef} />
          <primitive
            ref={lineMatRef}
            object={lineMaterial}
            attach="material"
          />
        </lineSegments>
      </group>

      <group ref={signalGroupRef}>
        <points frustumCulled={false}>
          <bufferGeometry ref={signalGeomRef} />
          <primitive
            ref={signalMatRef}
            object={signalMaterial}
            attach="material"
          />
        </points>
      </group>
    </>
  );
}

function IdentityRelayLinesAndSignals({
  identityPosition,
  targetIndices,
  positions,
  rarityColor,
  curveHeight,
  isMobile,
}) {
  const lineGeomRef = useRef(null);
  const signalGeomRef = useRef(null);
  const lineGroupRef = useRef(null);
  const signalGroupRef = useRef(null);

  const relayMetaRef = useRef([]);

  useEffect(() => {
    if (!identityPosition || !targetIndices?.length || !positions) {
      relayMetaRef.current = [];
      return;
    }

    const count = targetIndices.length;
    const segmentsPerEdge = 18;

    const linePositions = new Float32Array(
      count * (segmentsPerEdge - 1) * 2 * 3
    );
    const signalPositions = new Float32Array(count * 3);

    const a = new THREE.Vector3(
      identityPosition[0],
      identityPosition[1],
      identityPosition[2]
    );

    const meta = [];
    let lp = 0;

    for (let i = 0; i < count; i++) {
      const targetIdx = targetIndices[i];

      const b = new THREE.Vector3(
        positions[targetIdx * 3],
        positions[targetIdx * 3 + 1],
        positions[targetIdx * 3 + 2]
      );

      const mid = a
        .clone()
        .add(b)
        .multiplyScalar(0.5)
        .normalize()
        .multiplyScalar(a.length() + curveHeight);

      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const pts = curve.getPoints(segmentsPerEdge - 1);

      for (let s = 0; s < pts.length - 1; s++) {
        linePositions[lp++] = pts[s].x;
        linePositions[lp++] = pts[s].y;
        linePositions[lp++] = pts[s].z;

        linePositions[lp++] = pts[s + 1].x;
        linePositions[lp++] = pts[s + 1].y;
        linePositions[lp++] = pts[s + 1].z;
      }

      signalPositions[i * 3] = a.x;
      signalPositions[i * 3 + 1] = a.y;
      signalPositions[i * 3 + 2] = a.z;

      meta.push({
        curve,
        duration: 1.45 + i * 0.18,
        phase: i * 0.27,
      });
    }

    relayMetaRef.current = meta;

    if (lineGeomRef.current) {
      lineGeomRef.current.setAttribute(
        "position",
        new THREE.BufferAttribute(linePositions, 3)
      );
      lineGeomRef.current.computeBoundingSphere();
    }

    if (signalGeomRef.current) {
      signalGeomRef.current.setAttribute(
        "position",
        new THREE.BufferAttribute(signalPositions, 3)
      );
      signalGeomRef.current.computeBoundingSphere();
    }
  }, [identityPosition, targetIndices, positions, curveHeight]);

  useFrame((state) => {
    if (lineGroupRef.current) {
      lineGroupRef.current.rotation.y = 0;
      lineGroupRef.current.position.z = -3;
    }
    if (signalGroupRef.current) {
      signalGroupRef.current.rotation.y = 0;
      signalGroupRef.current.position.z = -3;
    }

    const signalGeom = signalGeomRef.current;
    if (!signalGeom || !relayMetaRef.current.length) return;

    const t = state.clock.getElapsedTime();
    const posAttr = signalGeom.getAttribute("position");
    const arr = posAttr.array;

    for (let i = 0; i < relayMetaRef.current.length; i++) {
      const m = relayMetaRef.current[i];
      const progress = ((t / m.duration) + m.phase) % 1;
      const p = m.curve.getPoint(progress);

      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }

    posAttr.needsUpdate = true;
  });

  const lineMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(rarityColor) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;

        void main() {
          gl_FragColor = vec4(uColor * 1.4, 0.34);
        }
      `,
    });
  }, [rarityColor]);

  const signalMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(rarityColor) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = ${isMobile ? "6.6" : "9.2"};
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float r = length(c);
          if (r > 0.5) discard;

          float glow = smoothstep(0.5, 0.0, r);
          glow = pow(glow, 1.5);

          gl_FragColor = vec4(uColor * 1.8, glow * 0.95);
        }
      `,
    });
  }, [rarityColor, isMobile]);

  useEffect(() => {
    return () => {
      lineMaterial.dispose();
      signalMaterial.dispose();
    };
  }, [lineMaterial, signalMaterial]);

  if (!identityPosition || !targetIndices?.length) return null;

  return (
    <>
      <group ref={lineGroupRef}>
        <lineSegments frustumCulled={false}>
          <bufferGeometry ref={lineGeomRef} />
          <primitive object={lineMaterial} attach="material" />
        </lineSegments>
      </group>

      <group ref={signalGroupRef}>
        <points frustumCulled={false}>
          <bufferGeometry ref={signalGeomRef} />
          <primitive object={signalMaterial} attach="material" />
        </points>
      </group>
    </>
  );
}

/* ===============================
   TESTER
================================= */

function GridTesterPanel({
  testCount,
  setTestCount,
  edgeCount,
  liveCount,
  liveSampleCount,
  coherent,
  hasIdentity,
  isMobile,
}) {
  const panelY = isMobile ? 6.0 : 6.8;
  const panelX = isMobile ? -7.35 : -7.15;
  const rowStartX = isMobile ? -8.35 : -8.6;
  const rowGap = isMobile ? 0.88 : 1.02;
  const panelScale = isMobile ? 0.72 : 1;

  const row1 = GRID_TEST_COUNTS.slice(0, 7);
  const row2 = GRID_TEST_COUNTS.slice(7);

  return (
    <group position={[0, 0, 0]} scale={[panelScale, panelScale, 1]}>
      <mesh position={[panelX, panelY, 0]}>
        <planeGeometry args={[5.3, 3.15]} />
        <meshBasicMaterial
          color={"#0A0F1A"}
          transparent
          opacity={0.72}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[panelX, panelY, -0.001]}>
        <planeGeometry args={[5.34, 3.19]} />
        <meshBasicMaterial
          color={"#87B8FF"}
          transparent
          opacity={0.09}
          depthWrite={false}
        />
      </mesh>

      <LabelSprite
        text="GLOBE TESTER"
        position={[rowStartX, panelY + 1.16, 0.02]}
        scale={isMobile ? [1.42, 0.18, 1] : [1.8, 0.22, 1]}
        color="#F5FAFF"
        fontSize={isMobile ? 34 : 42}
        bold
      />

      <LabelSprite
        text={`TEST WALLETS: ${testCount}`}
        position={[rowStartX + 0.55, panelY + 0.80, 0.02]}
        scale={isMobile ? [1.5, 0.14, 1] : [1.95, 0.17, 1]}
        color="#DCEBFF"
        fontSize={isMobile ? 24 : 32}
      />

      <LabelSprite
        text={`LIVE SAMPLE: ${liveSampleCount}`}
        position={[rowStartX + 0.55, panelY + 0.52, 0.02]}
        scale={isMobile ? [1.46, 0.14, 1] : [1.9, 0.17, 1]}
        color="#BFD8FF"
        fontSize={isMobile ? 22 : 30}
      />

      <LabelSprite
        text={`VISIBLE RELAYS: ${edgeCount}`}
        position={[rowStartX + 0.6, panelY + 0.24, 0.02]}
        scale={isMobile ? [1.56, 0.14, 1] : [2.0, 0.17, 1]}
        color="#A9CFFF"
        fontSize={isMobile ? 22 : 30}
      />

      <LabelSprite
        text={`LIVE MINTED: ${liveCount}`}
        position={[rowStartX + 0.55, panelY - 0.04, 0.02]}
        scale={isMobile ? [1.52, 0.14, 1] : [1.95, 0.17, 1]}
        color="#94A9C8"
        fontSize={isMobile ? 21 : 28}
      />

      <LabelSprite
        text={`GUARDIAN: ${coherent ? "COHERENT" : "IDLE"}   NODE: ${
          hasIdentity ? "PINNED" : "NONE"
        }`}
        position={[rowStartX + 1.02, panelY - 0.32, 0.02]}
        scale={isMobile ? [2.1, 0.12, 1] : [2.7, 0.15, 1]}
        color={coherent ? "#D8F4FF" : "#9BA8BA"}
        fontSize={isMobile ? 19 : 25}
      />

      {row1.map((value, i) => {
        const active = testCount === value;
        return (
          <group
            key={`btn-row1-${value}`}
            position={[rowStartX + i * rowGap, panelY - 0.74, 0.03]}
          >
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                setTestCount(value);
              }}
            >
              <planeGeometry args={isMobile ? [0.72, 0.26] : [0.84, 0.3]} />
              <meshBasicMaterial
                color={active ? "#6FAEFF" : "#1A2538"}
                transparent
                opacity={active ? 0.95 : 0.74}
                depthWrite={false}
              />
            </mesh>
            <LabelSprite
              text={String(value)}
              position={[0, 0, 0.02]}
              scale={isMobile ? [0.42, 0.1, 1] : [0.52, 0.12, 1]}
              color="#FFFFFF"
              fontSize={isMobile ? 22 : 30}
              bold={active}
            />
          </group>
        );
      })}

      {row2.map((value, i) => {
        const active = testCount === value;
        return (
          <group
            key={`btn-row2-${value}`}
            position={[rowStartX + i * rowGap, panelY - 1.14, 0.03]}
          >
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                setTestCount(value);
              }}
            >
              <planeGeometry args={isMobile ? [0.72, 0.26] : [0.84, 0.3]} />
              <meshBasicMaterial
                color={active ? "#6FAEFF" : "#1A2538"}
                transparent
                opacity={active ? 0.95 : 0.74}
                depthWrite={false}
              />
            </mesh>
            <LabelSprite
              text={String(value)}
              position={[0, 0, 0.02]}
              scale={isMobile ? [0.42, 0.1, 1] : [0.52, 0.12, 1]}
              color="#FFFFFF"
              fontSize={isMobile ? 22 : 30}
              bold={active}
            />
          </group>
        );
      })}

      <group position={[rowStartX + 5.5, panelY - 1.14, 0.03]}>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            setTestCount(Math.max(0, liveSampleCount));
          }}
        >
          <planeGeometry args={isMobile ? [0.90, 0.26] : [1.02, 0.3]} />
          <meshBasicMaterial
            color={"#1E314A"}
            transparent
            opacity={0.82}
            depthWrite={false}
          />
        </mesh>
        <LabelSprite
          text="LIVE"
          position={[0, 0, 0.02]}
          scale={isMobile ? [0.48, 0.10, 1] : [0.58, 0.12, 1]}
          color="#FFFFFF"
          fontSize={isMobile ? 22 : 30}
          bold
        />
      </group>
    </group>
  );
}

/* ===============================
   MAIN
================================= */

export default function GridScene({
  coherent,
  totalMinted,
  gridSeedKey,
  connectedWalletAddress,
  connectedCubeRarity = "Common",
  connectedIsGenesis = false,
}) {
  const nodePulseRef = useRef({
    data: null,
    texture: null,
    count: 0,
  });

  const rotationRef = useRef(0);

  const [testCount, setTestCount] = useState(16);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const globeRadius = isMobile ? MOBILE_GLOBE_RADIUS : DESKTOP_GLOBE_RADIUS;
  const nodeAltitude = isMobile ? MOBILE_NODE_ALTITUDE : DESKTOP_NODE_ALTITUDE;
  const shellDepth = isMobile ? MOBILE_SHELL_DEPTH : DESKTOP_SHELL_DEPTH;

  const activeDotBaseSize = isMobile
    ? MOBILE_ACTIVE_DOT_BASE_SIZE
    : DESKTOP_ACTIVE_DOT_BASE_SIZE;
  const activeDotPulseSize = isMobile
    ? MOBILE_ACTIVE_DOT_PULSE_SIZE
    : DESKTOP_ACTIVE_DOT_PULSE_SIZE;
  const curveHeight = isMobile
    ? RELAY_CURVE_HEIGHT_MOBILE
    : RELAY_CURVE_HEIGHT_DESKTOP;
  const relayMaxDistance = isMobile
    ? RELAY_MAX_DISTANCE_MOBILE
    : RELAY_MAX_DISTANCE_DESKTOP;

  const identityRelayMaxDistance = isMobile
    ? IDENTITY_RELAY_MAX_DISTANCE_MOBILE
    : IDENTITY_RELAY_MAX_DISTANCE_DESKTOP;

  const identityRelayCurveHeight = isMobile
    ? IDENTITY_RELAY_CURVE_HEIGHT_MOBILE
    : IDENTITY_RELAY_CURVE_HEIGHT_DESKTOP;

  const liveSampleCount = useMemo(() => {
    return Math.max(
      0,
      Math.min(MAX_VISIBLE_ACTIVE, resolveVisibleNodeCount(totalMinted))
    );
  }, [totalMinted]);

  const baseSeed = useMemo(() => {
    return fnv1a32(
      `${String(gridSeedKey || "GRID").toLowerCase()}|GRID_GLOBE_LOCAL_V2`
    );
  }, [gridSeedKey]);

  const populationSeed = useMemo(() => {
    return fnv1a32(`${baseSeed}|POPULATION`);
  }, [baseSeed]);

  const identitySeed = useMemo(() => {
    return fnv1a32(
      `${String(connectedWalletAddress || "NO_WALLET").toLowerCase()}|IDENTITY_NODE`
    );
  }, [connectedWalletAddress]);

  const activeCount = useMemo(() => {
    return liveSampleCount;
  }, [liveSampleCount]);

  const activePositions = useMemo(() => {
    if (!coherent || activeCount <= 0) return null;

    return generateSpherePoints(
      activeCount,
      populationSeed,
      globeRadius,
      nodeAltitude,
      true,
      shellDepth
    );
  }, [
    coherent,
    activeCount,
    populationSeed,
    globeRadius,
    nodeAltitude,
    shellDepth,
  ]);

  const relayEdges = useMemo(() => {
    if (!coherent || !activePositions || activeCount <= 1) return [];
    return buildLocalRelayEdges(
      activePositions,
      activeCount,
      relayMaxDistance,
      populationSeed
    );
  }, [
    coherent,
    activePositions,
    activeCount,
    relayMaxDistance,
    populationSeed,
  ]);

  const hasIdentityNode = useMemo(() => {
    return Boolean(connectedWalletAddress);
  }, [connectedWalletAddress]);

  const identityPosition = useMemo(() => {
    if (!coherent || !hasIdentityNode) return null;

    return generateIdentityPoint(
      identitySeed,
      globeRadius,
      nodeAltitude,
      true,
      shellDepth
    );
  }, [
    coherent,
    hasIdentityNode,
    identitySeed,
    globeRadius,
    nodeAltitude,
    shellDepth,
  ]);

  const identityColor = useMemo(() => {
    return getIdentityColor(connectedCubeRarity);
  }, [connectedCubeRarity]);

  const identityIsGenesis = useMemo(() => {
    return (
      Boolean(connectedIsGenesis) ||
      String(connectedCubeRarity || "").toLowerCase() === "genesis"
    );
  }, [connectedCubeRarity, connectedIsGenesis]);

  const identityRelayTargets = useMemo(() => {
    if (!coherent || !identityPosition || !activePositions || activeCount <= 0) {
      return [];
    }

    return buildIdentityRelayTargets(
      identityPosition,
      activePositions,
      activeCount,
      identityRelayMaxDistance,
      IDENTITY_RELAY_CONNECTIONS
    );
  }, [
    coherent,
    identityPosition,
    activePositions,
    activeCount,
    identityRelayMaxDistance,
  ]);

  useEffect(() => {
    return () => {
      if (nodePulseRef.current?.texture) {
        nodePulseRef.current.texture.dispose();
      }
    };
  }, []);

  return (
    <>
      <ambientLight intensity={0.02} />

      <hemisphereLight
        skyColor={"#1E3D74"}
        groundColor={"#010204"}
        intensity={0.05}
      />

      <GlobeShell radius={globeRadius} rotationRef={rotationRef} />

      {coherent && activePositions ? (
        <>
          <ActiveWalletDots
            positions={activePositions}
            nodePulseRef={nodePulseRef}
            rotationRef={rotationRef}
            baseSize={activeDotBaseSize}
            pulseSize={activeDotPulseSize}
          />

          <RelayLinesAndSignals
            positions={activePositions}
            edges={relayEdges}
            nodePulseRef={nodePulseRef}
            rotationRef={rotationRef}
            curveHeight={curveHeight}
            isMobile={isMobile}
          />

          {identityPosition ? (
            <IdentityNode
              position={identityPosition}
              rotationRef={rotationRef}
              rarityColor={identityColor}
              coherent={coherent}
              isMobile={isMobile}
              isGenesis={identityIsGenesis}
              totalMinted={totalMinted}
            />
          ) : null}

          {identityPosition && identityRelayTargets.length ? (
            <IdentityRelayLinesAndSignals
              identityPosition={identityPosition}
              targetIndices={identityRelayTargets}
              positions={activePositions}
              rarityColor={identityColor}
              curveHeight={identityRelayCurveHeight}
              isMobile={isMobile}
            />
          ) : null}
        </>
      ) : null}

      {SHOW_GRID_TESTER ? (
        <GridTesterPanel
          testCount={testCount}
          setTestCount={setTestCount}
          edgeCount={relayEdges.length + identityRelayTargets.length}
          liveCount={Math.max(0, Math.floor(Number(totalMinted) || 0))}
          liveSampleCount={liveSampleCount}
          coherent={Boolean(coherent)}
          hasIdentity={hasIdentityNode}
          isMobile={isMobile}
        />
      ) : null}
    </>
  );
}