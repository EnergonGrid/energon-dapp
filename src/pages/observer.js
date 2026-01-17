// src/pages/observer.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

import {
  WagmiProvider,
  createConfig,
  http,
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWatchBlockNumber,
  useWatchContractEvent,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- YOUR CONTRACTS (Flare) ---
const EON_ADDRESS = "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79";
const CUBE_ADDRESS = "0x30e1076bDf2B123B54486C2721125388af2d2061";

// --- LAYOUT SETTINGS ---
const NARROW_BREAKPOINT = 1100; // px
const MAX_ATTRS = 10;

// Attributes panel sizing
const ATTR_PANEL_W = 420;
const ATTR_PANEL_INSET = 16;
const ATTR_PANEL_GAP = 8;
const ATTR_PANEL_MAX_H = 360;

// Collapsed heights
const ATTR_COLLAPSED_H = 44; // desktop collapsed bar height
const SHEET_COLLAPSED_H = 52; // narrow collapsed bar height

// Narrow screen sheet sizing (bottom-docked; no scroll)
const SHEET_INSET = 12;
const SHEET_H = 320;

// Minimal ABIs (read-only + events)
const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },

  // ✅ ERC20 Transfer event (for sparks)
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    anonymous: false,
  },
];

const erc721Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },

  // ✅ Ownership verification
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }],
  },

  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },

  // ✅ ERC721 Transfer event (for sparks)
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
    anonymous: false,
  },
];

// Flare chain (Mainnet)
const flare = {
  id: 14,
  name: "Flare",
  network: "flare",
  nativeCurrency: { name: "Flare", symbol: "FLR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://flare-api.flare.network/ext/C/rpc"] },
    public: { http: ["https://flare-api.flare.network/ext/C/rpc"] },
  },
};

const wagmiConfig = createConfig({
  chains: [flare],
  connectors: [injected()],
  transports: { [flare.id]: http("https://flare-api.flare.network/ext/C/rpc") },
});

const queryClient = new QueryClient();

// ✅ client-only gate to prevent hydration mismatch
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function formatUnitsSafe(value, decimals) {
  if (value === undefined || decimals === undefined) return "—";
  const d = Number(decimals);
  const s = value.toString().padStart(d + 1, "0");
  const whole = s.slice(0, -d);
  const frac = s.slice(-d).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

function shortAddr(a) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function safeBigIntToString(v) {
  try {
    return typeof v === "bigint" ? v.toString() : String(v);
  } catch {
    return String(v);
  }
}

function sameAddr(a, b) {
  if (!a || !b) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

// --- Metadata helpers ---
function ipfsToHttps(uri) {
  if (!uri) return null;

  // Prefer ipfs:// -> https gateway
  if (uri.startsWith("ipfs://")) {
    const cidPath = uri.replace("ipfs://", "");
    return `https://ipfs.io/ipfs/${cidPath}`;
  }

  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

  // Raw CID
  if (uri.startsWith("bafy") || uri.startsWith("Qm")) {
    return `https://ipfs.io/ipfs/${uri}`;
  }

  return uri;
}

async function fetchJsonWithGatewayFallback(url) {
  // If it's ipfs.io and fails, try one alternative gateway
  const gateways = [
    url,
    url?.includes("https://ipfs.io/ipfs/")
      ? url.replace("https://ipfs.io/ipfs/", "https://cloudflare-ipfs.com/ipfs/")
      : null,
  ].filter(Boolean);

  let lastErr = null;
  for (const u of gateways) {
    try {
      const res = await fetch(u, { cache: "no-store" });
      if (!res.ok) throw new Error(`Metadata fetch failed (${res.status})`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Metadata fetch error");
}

function attributesToMap(attrs) {
  const map = {};
  if (!Array.isArray(attrs)) return map;
  for (const a of attrs) {
    const k = a?.trait_type ?? a?.traitType ?? a?.key;
    const v = a?.value;
    if (k) map[String(k)] = v;
  }
  return map;
}

// --- UI pill ---
function StatusPill({ mode }) {
  const map = {
    DISCONNECTED: { text: "DISCONNECTED", bg: "rgba(255,255,255,0.06)", br: "rgba(255,255,255,0.18)" },
    SILENT: { text: "SILENT", bg: "rgba(80,120,190,0.10)", br: "rgba(80,120,190,0.28)" },
    COHERENT: { text: "COHERENT", bg: "rgba(55,183,255,0.12)", br: "rgba(55,183,255,0.35)" },
    FRACTURED: { text: "FRACTURED", bg: "rgba(255,70,70,0.14)", br: "rgba(255,70,70,0.40)" },
  };
  const s = map[mode] || map.DISCONNECTED;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${s.br}`,
        background: s.bg,
        fontSize: 11,
        letterSpacing: "0.14em",
        opacity: 0.95,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.55)" }} />
      {s.text}
    </span>
  );
}

// ✅ Smaller attribute tile for compact grid
function AttrTileSmall({ k, v }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: "7px 9px",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 10,
          opacity: 0.68,
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {k}
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 12,
          opacity: 0.92,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {String(v ?? "—")}
      </div>
    </div>
  );
}

// ✅ Rarity -> color mapping
const RARITY_COLORS = {
  Common: "#4FA3FF",
  Uncommon: "#00FFC6",
  Rare: "#8B5CFF",
  Legendary: "#FF9F1C",
  Mythic: "#FF3B3B",
};

const GENESIS_RAINBOW = ["#4FA3FF", "#00FFC6", "#2DFF57", "#FFE600", "#FF9F1C", "#FF3B3B", "#8B5CFF"];

/**
 * ⭐ Starfield (gated)
 */
function Starfield({ enabled, count = 700 }) {
  const pointsRef = useRef(null);
  const velocities = useRef(null);

  const { geometry, vels } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const v = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Wide field behind the cube
      positions[i3] = (Math.random() - 0.5) * 48;
      positions[i3 + 1] = (Math.random() - 0.5) * 34;
      positions[i3 + 2] = -Math.random() * 70 - 8;

      // Forward drift speed (slightly varied)
      v[i] = 0.010 + Math.random() * 0.020;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, vels: v };
  }, [count]);

  useEffect(() => {
    velocities.current = vels;
  }, [vels]);

  useFrame((state, delta) => {
    if (!enabled || !pointsRef.current || !velocities.current) return;

    const attr = pointsRef.current.geometry.attributes.position;
    const positions = attr.array;

    // Speed scale keeps it consistent across devices
    const speedScale = Math.min(1.8, Math.max(0.6, delta * 60));

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 2] += velocities.current[i] * speedScale;

      // Recycle when it approaches the camera
      if (positions[i3 + 2] > 4.5) {
        positions[i3] = (Math.random() - 0.5) * 48;
        positions[i3 + 1] = (Math.random() - 0.5) * 34;
        positions[i3 + 2] = -70 - Math.random() * 10;
        velocities.current[i] = 0.010 + Math.random() * 0.020;
      }
    }

    attr.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.06}
        color={"#bfe2ff"}
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * ✨ Transaction Sparks (direction + reward aware, minimal)
 * event = { direction: "in" | "out", isReward: boolean } OR null
 */
function TransactionSparks({ enabled, event, maxSparks = 22 }) {
  const instRef = useRef(null);
  const sparksRef = useRef([]);
  const tmpObj = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const COLOR_INBOUND = useMemo(() => new THREE.Color("#BFE9FF"), []);
  const COLOR_OUTBOUND = useMemo(() => new THREE.Color("#FFD7A1"), []);

  // Create instanceColor buffer once
  useEffect(() => {
    if (!instRef.current) return;
    const colors = new Float32Array(maxSparks * 3);
    instRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
  }, [maxSparks]);

  // Add one spark per event
  useEffect(() => {
    if (!enabled || !event) return;
    if (!instRef.current) return;

    const sparks = sparksRef.current;

    let idx = sparks.findIndex((s) => !s.active);
    if (idx === -1) idx = 0;

    const inbound = event.direction === "in";
    const rewardBoost = event.isReward ? 1.15 : 1.0;

    sparks[idx] = {
      active: true,
      x: (Math.random() - 0.5) * 18,
      y: (Math.random() - 0.5) * 10,
      z: -10 - Math.random() * 26,
      angle: (Math.random() - 0.5) * 0.65,
      speed: 0.55 + Math.random() * 0.55,
      life: 0,
      ttl: 0.85,
      len: 0.22 + Math.random() * 0.22,
      wid: 0.035 + Math.random() * 0.02,
      color: inbound ? COLOR_INBOUND : COLOR_OUTBOUND,
      boost: rewardBoost,
    };
  }, [event, enabled, COLOR_INBOUND, COLOR_OUTBOUND]);

  useFrame((state, delta) => {
    if (!enabled || !instRef.current) return;

    const sparks = sparksRef.current;

    if (sparks.length < maxSparks) {
      for (let i = sparks.length; i < maxSparks; i++) sparks.push({ active: false });
    }

    for (let i = 0; i < maxSparks; i++) {
      const s = sparks[i];
      if (!s || !s.active) {
        tmpObj.position.set(0, 0, 9999);
        tmpObj.scale.set(0, 0, 0);
        tmpObj.rotation.set(0, 0, 0);
        tmpObj.updateMatrix();
        instRef.current.setMatrixAt(i, tmpObj.matrix);

        if (instRef.current.instanceColor) {
          tmpColor.setRGB(0, 0, 0);
          instRef.current.setColorAt(i, tmpColor);
        }
        continue;
      }

      s.life += delta;
      const p = Math.min(1, s.life / s.ttl);

      s.z += s.speed * (delta * 60) * 0.08;
      s.x += Math.sin(s.angle) * (delta * 60) * 0.006;
      s.y += Math.cos(s.angle) * (delta * 60) * 0.004;

      const pop = Math.sin(Math.min(1, p) * Math.PI);
      const intensity = (0.15 + 0.95 * pop) * (s.boost ?? 1.0);

      tmpObj.position.set(s.x, s.y, s.z);
      tmpObj.rotation.set(0, 0, s.angle);
      tmpObj.scale.set(s.len * (0.55 + 0.9 * intensity), s.wid * (0.6 + 0.7 * intensity), 1);
      tmpObj.updateMatrix();
      instRef.current.setMatrixAt(i, tmpObj.matrix);

      if (instRef.current.instanceColor) {
        tmpColor.copy(s.color);
        tmpColor.multiplyScalar(intensity);
        instRef.current.setColorAt(i, tmpColor);
      }

      if (s.life >= s.ttl || s.z > 3.25) {
        s.active = false;
      }
    }

    instRef.current.instanceMatrix.needsUpdate = true;
    if (instRef.current.instanceColor) instRef.current.instanceColor.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <instancedMesh ref={instRef} args={[null, null, maxSparks]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} vertexColors />
    </instancedMesh>
  );
}

// ✅ isBound controls when coherent "energy" activates (prevents premature pulse/color/heartbeat)
function EnergonCube({ beat, mode, rarityTier, isGenesis, isBound }) {
  const groupRef = useRef(null);

  const cubeMatRef = useRef(null);
  const sphereMatRef = useRef(null);
  const edgeMatRef = useRef(null);

  const pulse = useRef(0);

  // Base palette
  const baseColor = useMemo(() => new THREE.Color("#0B1020"), []);
  const sphereBaseColor = useMemo(() => new THREE.Color("#0A0A0C"), []); // black sphere base
  const edgeBaseColor = useMemo(() => new THREE.Color("#22324A"), []);

  const rainbowColors = useMemo(() => GENESIS_RAINBOW.map((c) => new THREE.Color(c)), []);
  const pulseColorRef = useRef(new THREE.Color(RARITY_COLORS.Common));

  // SILENT + FRACTURED => sphere only (no cube, no edges)
  const sphereOnly = mode === "SILENT" || mode === "FRACTURED";

  // Lock base model materials once
  const baseLocked = useRef(false);
  useEffect(() => {
    if (!sphereMatRef.current) return;
    if (baseLocked.current) return;

    sphereMatRef.current.color.copy(sphereBaseColor);
    sphereMatRef.current.emissive.copy(new THREE.Color("#000000"));
    sphereMatRef.current.emissiveIntensity = 0.12;
    sphereMatRef.current.roughness = 0.35;
    sphereMatRef.current.metalness = 0.05;

    if (cubeMatRef.current) {
      cubeMatRef.current.color.copy(baseColor);
      cubeMatRef.current.transparent = true;
      cubeMatRef.current.opacity = 0.08;
      cubeMatRef.current.roughness = 0.08;
      cubeMatRef.current.metalness = 0.0;
      cubeMatRef.current.transmission = 0.35;
      cubeMatRef.current.thickness = 0.9;
      cubeMatRef.current.ior = 1.35;
      cubeMatRef.current.clearcoat = 1;
      cubeMatRef.current.clearcoatRoughness = 0.1;
      cubeMatRef.current.envMapIntensity = 1.25; // baseline; boosted when bound
      cubeMatRef.current.emissive.copy(baseColor);
      cubeMatRef.current.emissiveIntensity = 0.05;
      cubeMatRef.current.depthWrite = false;
    }

    if (edgeMatRef.current) {
      edgeMatRef.current.color.copy(edgeBaseColor);
      edgeMatRef.current.transparent = true;
      edgeMatRef.current.opacity = 0.28;
    }

    baseLocked.current = true;
  }, [baseColor, sphereBaseColor, edgeBaseColor]);

  // Only set pulse color on beat when COHERENT + bound
  useEffect(() => {
    if (mode !== "COHERENT") return;
    if (!isBound) return;

    pulse.current = 1.0;

    if (isGenesis) {
      const i = Math.floor(Math.random() * rainbowColors.length);
      pulseColorRef.current.copy(rainbowColors[i]);
      return;
    }

    const tier = String(rarityTier || "Common");
    const hex = RARITY_COLORS[tier] || RARITY_COLORS.Common;
    pulseColorRef.current.set(hex);
  }, [beat, mode, rarityTier, isGenesis, rainbowColors, isBound]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    const isCoherent = mode === "COHERENT";
    const isFractured = mode === "FRACTURED";
    const isSilent = mode === "SILENT";
    const isDisconnected = mode === "DISCONNECTED";

    const rotY = isFractured ? 0.55 : 0.12;
    const rotX = isFractured ? 0.22 : 0.04;

    // Fractured motion even sphere-only
    const shakeAmt = isFractured ? 0.055 : 0.0;
    const breatheSpeed = isFractured ? 3.6 : 0.9;

    const decay = isCoherent && isBound ? 2.4 : 1.35;
    pulse.current = Math.max(0, pulse.current - delta * decay);

    const breathe = 0.35 + 0.2 * Math.sin(t * breatheSpeed);
    const hit = isBound ? pulse.current : 0;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotY;
      groupRef.current.rotation.x += delta * rotX;

      if (isFractured) {
        const burst = 0.5 + 0.5 * Math.sin(t * 12.0);
        const shake = (0.6 + 0.4 * Math.sin(t * 18)) * (burst + 0.25);
        groupRef.current.position.x = Math.sin(t * 45) * shakeAmt * shake;
        groupRef.current.position.y = Math.cos(t * 40) * shakeAmt * shake;

        const swell = 0.05 + 0.02 * Math.sin(t * 10);
        const s = 1 + swell;
        groupRef.current.scale.set(s, s, s);
      } else {
        groupRef.current.position.x = 0;
        groupRef.current.position.y = 0;

        const s = 1 + (isCoherent && isBound ? hit * 0.04 : 0);
        groupRef.current.scale.set(s, s, s);
      }
    }

    // Sphere look
    if (sphereMatRef.current) {
      sphereMatRef.current.color.copy(sphereBaseColor);

      // COHERENT but not bound => quiet black sphere (no pulse color)
      if ((isCoherent && !isBound) || isDisconnected || isSilent) {
        sphereMatRef.current.emissive.copy(new THREE.Color("#000000"));
        sphereMatRef.current.emissiveIntensity = 0.12 + breathe * 0.06;
      } else if (isFractured) {
        const flick = 0.5 + 0.5 * Math.sin(t * 14);
        sphereMatRef.current.emissive.copy(new THREE.Color("#000000"));
        sphereMatRef.current.emissiveIntensity = 0.12 + breathe * 0.08 + flick * 0.18;
      } else {
        sphereMatRef.current.emissive.copy(pulseColorRef.current);
        sphereMatRef.current.emissiveIntensity = 0.25 + breathe * 0.25 + hit * 4.0;
      }
    }

    // Cube + edges update (only if present)
    if (!sphereOnly) {
      if (cubeMatRef.current) {
        cubeMatRef.current.color.copy(baseColor);
        cubeMatRef.current.opacity = 0.08;
        cubeMatRef.current.transmission = 0.35;
        cubeMatRef.current.depthWrite = false;

        // ✅ EnvMap boost ONLY when bound
        const envBase = isBound ? 2.45 : 1.25;
        const envBreathe = isBound ? 0.25 * Math.sin(t * 0.9) : 0;
        const envHit = isBound ? hit * 1.25 : 0;
        cubeMatRef.current.envMapIntensity = envBase + envBreathe + envHit;

        if ((isCoherent && !isBound) || isDisconnected || isSilent) {
          cubeMatRef.current.emissive.copy(baseColor);
          cubeMatRef.current.emissiveIntensity = 0.05 + breathe * 0.04;
        } else {
          cubeMatRef.current.emissive.copy(pulseColorRef.current);
          cubeMatRef.current.emissiveIntensity = 0.06 + breathe * 0.08 + hit * 1.0;
        }

        cubeMatRef.current.clearcoatRoughness = isBound ? 0.07 : 0.1;
        cubeMatRef.current.roughness = isBound ? 0.06 : 0.08;
      }

      if (edgeMatRef.current) {
        edgeMatRef.current.color.copy(edgeBaseColor);
        edgeMatRef.current.opacity = 0.28 + breathe * 0.06;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Sphere always exists */}
      <mesh>
        <sphereGeometry args={[0.38, 48, 48]} />
        <meshStandardMaterial
          ref={sphereMatRef}
          color={"#0A0A0C"}
          emissive={"#000000"}
          emissiveIntensity={0.12}
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>

      {/* Only show cube + edges in COHERENT or DISCONNECTED (NOT SILENT / NOT FRACTURED) */}
      {sphereOnly ? null : (
        <>
          <mesh>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshPhysicalMaterial
              ref={cubeMatRef}
              color={"#0B1020"}
              transparent
              opacity={0.08}
              roughness={0.08}
              metalness={0.0}
              transmission={0.35}
              thickness={0.9}
              ior={1.35}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={1.25}
              depthWrite={false}
            />
          </mesh>

          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(1.205, 1.205, 1.205)]} />
            <lineBasicMaterial ref={edgeMatRef} color={"#22324A"} transparent opacity={0.28} />
          </lineSegments>
        </>
      )}
    </group>
  );
}

function ObserverInner() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [beat, setBeat] = useState(0);

  // ✅ Direction + reward aware spark event (single object)
  // { direction: "in" | "out", isReward: boolean } | null
  const [sparkEvent, setSparkEvent] = useState(null);

  // ✅ prevent spark spam if lots of transfers come in
  const lastSparkAt = useRef(0);
  const emitSpark = (next) => {
    const now = Date.now();
    if (now - lastSparkAt.current < 120) return; // ~8 sparks/sec max
    lastSparkAt.current = now;
    setSparkEvent(next);
  };

  // ✅ Left HUD folding (everything under the top header row). Default open.
  const [hudOpen, setHudOpen] = useState(true);

  // Manual token input + touch flag (prevents autofill overwriting user typing)
  const [manualTokenId, setManualTokenId] = useState("");
  const [manualTouched, setManualTouched] = useState(false);

  // Token panel folding (left HUD). Default open.
  const [tokenPanelOpen, setTokenPanelOpen] = useState(true);

  // Attributes folding (bottom-right / bottom-sheet). Default collapsed.
  const [attrsOpen, setAttrsOpen] = useState(false);

  const [tokenUri, setTokenUri] = useState(null);
  const [meta, setMeta] = useState(null);
  const [metaErr, setMetaErr] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cubeCount = useReadContract({
    abi: erc721Abi,
    address: CUBE_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const decimals = useReadContract({
    abi: erc20Abi,
    address: EON_ADDRESS,
    functionName: "decimals",
    query: { enabled: true },
  });

  const eonBal = useReadContract({
    abi: erc20Abi,
    address: EON_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const cubeN = cubeCount.data ? Number(cubeCount.data) : 0;

  // ✅ Mode rules locked
  const mode = !isConnected ? "DISCONNECTED" : cubeN === 0 ? "SILENT" : cubeN === 1 ? "COHERENT" : "FRACTURED";

  // Auto tokenId (if enumerable) — only meaningful in COHERENT
  const tokenOfOwnerByIndex = useReadContract({
    abi: erc721Abi,
    address: CUBE_ADDRESS,
    functionName: "tokenOfOwnerByIndex",
    args: address ? [address, 0n] : undefined,
    query: {
      enabled: !!address && isConnected && mode === "COHERENT",
      retry: 0,
    },
  });

  // Autofill once (unless user typed)
  useEffect(() => {
    if (!isConnected || mode !== "COHERENT") return;
    if (manualTouched) return;
    if (!tokenOfOwnerByIndex.isSuccess || tokenOfOwnerByIndex.data == null) return;

    const tidStr = safeBigIntToString(tokenOfOwnerByIndex.data);
    if (!tidStr) return;

    setManualTokenId((prev) => (prev.trim() ? prev : tidStr));
  }, [isConnected, mode, manualTouched, tokenOfOwnerByIndex.isSuccess, tokenOfOwnerByIndex.data]);

  // Reset when leaving coherent or disconnecting
  useEffect(() => {
    if (!isConnected || mode !== "COHERENT") {
      setManualTokenId("");
      setManualTouched(false);
      setTokenPanelOpen(true);
      setBeat(0);
      setTokenUri(null);
      setMeta(null);
      setMetaErr(null);
      setLoadingMeta(false);
      setSparkEvent(null);
      lastSparkAt.current = 0;

      // Keep current behavior: HUD comes back open when leaving COHERENT/disconnecting
      setHudOpen(true);
    }
  }, [isConnected, mode]);

  // Parse manual input
  const manualTokenIdClean = manualTokenId.trim();
  const manualTokenIdValid = /^\d+$/.test(manualTokenIdClean);

  // Candidate tokenId (only in COHERENT)
  const candidateTokenId = useMemo(() => {
    if (mode !== "COHERENT") return null;

    if (manualTokenIdValid) return BigInt(manualTokenIdClean);

    if (tokenOfOwnerByIndex.isSuccess && tokenOfOwnerByIndex.data != null) {
      return tokenOfOwnerByIndex.data;
    }

    return null;
  }, [mode, manualTokenIdValid, manualTokenIdClean, tokenOfOwnerByIndex.isSuccess, tokenOfOwnerByIndex.data]);

  // ownerOf check for candidateTokenId
  const ownerOfRead = useReadContract({
    abi: erc721Abi,
    address: CUBE_ADDRESS,
    functionName: "ownerOf",
    args: candidateTokenId != null ? [candidateTokenId] : undefined,
    query: { enabled: !!address && isConnected && mode === "COHERENT" && candidateTokenId != null },
  });

  const ownership = useMemo(() => {
    if (!isConnected || mode !== "COHERENT" || !address || candidateTokenId == null)
      return { ok: false, status: "IDLE", owner: null };

    if (ownerOfRead.isLoading) return { ok: false, status: "CHECKING", owner: null };

    // ownerOf reverts for unminted IDs => wagmi marks error
    if (ownerOfRead.isError) return { ok: false, status: "NOT_MINTED", owner: null };

    if (ownerOfRead.isSuccess) {
      const owner = ownerOfRead.data;
      if (sameAddr(owner, address)) return { ok: true, status: "OWNED", owner };
      return { ok: false, status: "NOT_OWNED", owner };
    }

    return { ok: false, status: "IDLE", owner: null };
  }, [isConnected, mode, address, candidateTokenId, ownerOfRead.isLoading, ownerOfRead.isError, ownerOfRead.isSuccess, ownerOfRead.data]);

  // ✅ Derived tokenId only when owned
  const derivedTokenId = ownership.ok ? candidateTokenId : null;

  // ✅ Bound only after ownership confirmed
  const isBound = mode === "COHERENT" && derivedTokenId != null;

  // Collapse token panel automatically once bound (more space)
  useEffect(() => {
    if (isBound) setTokenPanelOpen(false);
  }, [isBound]);

  // Read tokenURI only when owned
  const tokenUriRead = useReadContract({
    abi: erc721Abi,
    address: CUBE_ADDRESS,
    functionName: "tokenURI",
    args: derivedTokenId != null ? [derivedTokenId] : undefined,
    query: { enabled: mode === "COHERENT" && derivedTokenId != null },
  });

  useEffect(() => {
    if (tokenUriRead.isSuccess && tokenUriRead.data) setTokenUri(tokenUriRead.data);
  }, [tokenUriRead.isSuccess, tokenUriRead.data]);

  // Fetch metadata only when owned + tokenUri exists
  useEffect(() => {
    let alive = true;

    async function run() {
      if (mode !== "COHERENT") return;
      if (!derivedTokenId) return;
      if (!tokenUri) return;

      setLoadingMeta(true);
      setMetaErr(null);

      try {
        const url = ipfsToHttps(tokenUri);
        if (!url) throw new Error("Missing tokenURI");

        const json = await fetchJsonWithGatewayFallback(url);
        if (!alive) return;
        setMeta(json);
      } catch (e) {
        if (!alive) return;
        setMeta(null);
        setMetaErr(e?.message || "Metadata fetch error");
      } finally {
        if (!alive) return;
        setLoadingMeta(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [mode, derivedTokenId, tokenUri]);

  const attrs = useMemo(() => {
    const m = meta?.attributes;
    return Array.isArray(m) ? m : [];
  }, [meta]);

  const attrsCapped = useMemo(() => attrs.slice(0, MAX_ATTRS), [attrs]);
  const attrMap = useMemo(() => attributesToMap(attrsCapped), [attrsCapped]);

  const rarityTier = useMemo(() => {
    const r = attrMap["Rarity Tier"];
    return r ? String(r) : "Common";
  }, [attrMap]);

  const tokenIdStr = useMemo(() => (derivedTokenId != null ? safeBigIntToString(derivedTokenId) : ""), [derivedTokenId]);

  const isGenesis = useMemo(() => {
    if (tokenIdStr === "1") return true;
    const g = attrMap["Genesis Status"] || attrMap["Genesis Type"] || attrMap["Genesis"];
    return !!g;
  }, [tokenIdStr, attrMap]);

  const rarityLabel = useMemo(() => (tokenIdStr === "1" ? "Genesis" : rarityTier), [tokenIdStr, rarityTier]);

  const eonText = formatUnitsSafe(eonBal.data, decimals.data);

  const canShowAttributes = isBound && meta && !metaErr;

  // Bottom padding ONLY when attributes panel is open AND narrow (so 3D stays above it)
  const bottomPad = canShowAttributes && isNarrow && attrsOpen ? SHEET_H + SHEET_INSET * 2 : 0;

  const ownershipMsg = useMemo(() => {
    if (mode !== "COHERENT" || candidateTokenId == null) return null;
    if (ownerOfRead.isLoading) return { text: "Checking ownership…", color: "rgba(255,255,255,0.70)" };
    if (ownership.status === "NOT_MINTED") return { text: "Not minted / invalid tokenId.", color: "#ff8a3d" };
    if (ownership.status === "NOT_OWNED") return { text: "Token is not owned by this wallet.", color: "#ff8a3d" };
    if (ownership.status === "OWNED") return { text: "Owned ✓", color: "rgba(150,255,190,0.9)" };
    return null;
  }, [mode, candidateTokenId, ownerOfRead.isLoading, ownership.status]);

  // ✅ Heartbeat only runs AFTER bound (prevents premature pulsing)
  useWatchBlockNumber({
    enabled: isConnected && mode === "COHERENT" && isBound,
    onBlockNumber() {
      setBeat((b) => b + 1);
    },
  });

  // ✅ UPDATED: Spark watchers are CONNECTED-only (network-wide visual sparks),
  // plus spam prevention via emitSpark()
  useWatchContractEvent({
    address: CUBE_ADDRESS,
    abi: erc721Abi,
    eventName: "Transfer",
    enabled: isConnected, // ✅ only when connected
    onLogs(logs) {
      const l = (logs || [])[0];
      if (!l) return;

      // network-wide event — no wallet filtering
      // direction is "visual direction" now (not wallet-relative)
      emitSpark({
        direction: Math.random() > 0.5 ? "in" : "out",
        isReward: false,
      });
    },
  });

  useWatchContractEvent({
    address: EON_ADDRESS,
    abi: erc20Abi,
    eventName: "Transfer",
    enabled: isConnected, // ✅ only when connected
    onLogs(logs) {
      const l = (logs || [])[0];
      if (!l) return;

      emitSpark({
        direction: Math.random() > 0.5 ? "in" : "out",
        isReward: true,
      });
    },
  });

  const displayedCandidateId = useMemo(() => {
    if (candidateTokenId != null) return safeBigIntToString(candidateTokenId);
    return "—";
  }, [candidateTokenId]);

  return (
    <div style={{ height: "100vh", background: "#070A12", color: "white", position: "relative", overflow: "hidden" }}>
      {/* LEFT HUD (collapsible under header row) */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          zIndex: 20,
          width: 420,
          maxWidth: "calc(100vw - 36px)",
          fontFamily: "ui-sans-serif, system-ui",
          lineHeight: 1.25,
          pointerEvents: "auto",
        }}
      >
        {/* ✅ Header row stays visible (Energon Guardian / Observer Dashboard / Connect) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button
            onClick={() => setHudOpen((v) => !v)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: 0,
              border: "none",
              background: "transparent",
              color: "white",
              cursor: "pointer",
              textAlign: "left",
            }}
            title={hudOpen ? "Collapse HUD" : "Expand HUD"}
          >
            <div>
              <div style={{ letterSpacing: "0.22em", fontSize: 12, opacity: 0.75 }}>ENERGON GUARDIAN</div>
              <div style={{ fontSize: 20, marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
                Observer Dashboard <StatusPill mode={mode} />
                <span style={{ opacity: 0.55, fontSize: 12, marginLeft: 2 }}>{hudOpen ? "▴" : "▾"}</span>
              </div>
            </div>
          </button>

          {!isConnected ? (
            <button
              onClick={(e) => {
                e.stopPropagation(); // ✅ prevent header toggle
                connect({ connector: injected() });
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Connect
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation(); // ✅ prevent header toggle
                disconnect();
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Disconnect
            </button>
          )}
        </div>

        {/* ✅ Everything under the header collapses */}
        {hudOpen ? (
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.65, letterSpacing: "0.08em" }}>WALLET</div>
                <div style={{ marginTop: 6, fontSize: 14, opacity: 0.95 }}>{isConnected ? shortAddr(address) : "Not connected"}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, opacity: 0.65, letterSpacing: "0.08em" }}>CUBE COUNT</div>
                <div style={{ marginTop: 6, fontSize: 14, opacity: 0.95 }}>{cubeCount.isLoading ? "…" : String(cubeN)}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, opacity: 0.65, letterSpacing: "0.08em" }}>EON BALANCE</div>
                <div style={{ marginTop: 6, fontSize: 14, opacity: 0.95 }}>{isConnected ? eonText : "—"}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, opacity: 0.65, letterSpacing: "0.08em" }}>HEARTBEAT</div>
                <div style={{ marginTop: 6, fontSize: 14, opacity: 0.95 }}>
                  {mode === "COHERENT" ? (isBound ? beat : "—") : beat}
                  {isConnected && mode === "COHERENT" && !isBound ? <span style={{ opacity: 0.6 }}> (locked)</span> : null}
                  {isConnected && mode !== "COHERENT" ? <span style={{ opacity: 0.6 }}> (locked)</span> : null}
                </div>
              </div>
            </div>

            {/* COHERENT-only NFT viewer */}
            {mode === "COHERENT" ? (
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
                {/* When bound + collapsed: compact header line (click to expand again) */}
                {!tokenPanelOpen && isBound ? (
                  <button
                    onClick={() => setTokenPanelOpen(true)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.18)",
                      color: "white",
                      cursor: "pointer",
                    }}
                    title="Click to edit token ID"
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>
                        Token ID: <span style={{ fontWeight: 700, opacity: 0.98 }}>{tokenIdStr}</span>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>
                        Rarity: <span style={{ fontWeight: 700, opacity: 0.98 }}>{rarityLabel}</span>
                      </div>
                    </div>
                  </button>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 12, opacity: 0.82 }}>
                        Token ID: <span style={{ opacity: 0.98, fontWeight: 600 }}>{displayedCandidateId}</span>
                        {isGenesis ? <span style={{ marginLeft: 10, opacity: 0.75 }}>(Genesis)</span> : null}
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.82 }}>
                        Rarity: <span style={{ opacity: 0.98, fontWeight: 600 }}>{isBound ? rarityLabel : "—"}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 8 }}>Token ID (loads only if owned):</div>
                      <input
                        value={manualTokenId}
                        onChange={(e) => {
                          setManualTouched(true);
                          setManualTokenId(e.target.value);
                        }}
                        inputMode="numeric"
                        placeholder="e.g. 1"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 12,
                          border:
                            manualTokenId && !manualTokenIdValid
                              ? "1px solid rgba(255,70,70,0.65)"
                              : "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(0,0,0,0.25)",
                          color: "white",
                          outline: "none",
                        }}
                      />
                      {manualTokenId && !manualTokenIdValid ? (
                        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75, color: "#ff8a3d" }}>Digits only.</div>
                      ) : null}
                      {ownershipMsg ? (
                        <div style={{ marginTop: 8, fontSize: 12, color: ownershipMsg.color, opacity: 0.95 }}>{ownershipMsg.text}</div>
                      ) : null}
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                      Metadata:{" "}
                      {derivedTokenId == null
                        ? "—"
                        : loadingMeta
                        ? "Loading…"
                        : metaErr
                        ? <span style={{ color: "#ff8a3d" }}>{metaErr}</span>
                        : meta
                        ? "OK"
                        : "—"}
                    </div>

                    {isBound ? (
                      <div style={{ marginTop: 10 }}>
                        <button
                          onClick={() => setTokenPanelOpen(false)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.06)",
                            color: "white",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Collapse
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {/* FRACTURED helper text */}
            {mode === "FRACTURED" ? (
              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
                Fractured mode: more than 1 cube detected. (Metadata display disabled by design.)
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ATTRIBUTES (folds down to bottom-right corner / bottom sheet) */}
      {canShowAttributes ? (
        <div
          style={
            isNarrow
              ? {
                  position: "absolute",
                  left: SHEET_INSET,
                  right: SHEET_INSET,
                  bottom: SHEET_INSET,
                  height: attrsOpen ? SHEET_H : SHEET_COLLAPSED_H,
                  zIndex: 22,
                  padding: 12,
                  boxSizing: "border-box",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 18,
                  background: "rgba(7,10,18,0.92)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  fontFamily: "ui-sans-serif, system-ui",
                  lineHeight: 1.25,
                  overflow: "hidden",
                  pointerEvents: "auto",
                  display: "flex",
                  flexDirection: "column",
                  transition: "height 220ms ease",
                }
              : {
                  position: "absolute",
                  right: ATTR_PANEL_INSET,
                  bottom: ATTR_PANEL_INSET,
                  width: ATTR_PANEL_W,
                  height: attrsOpen ? ATTR_PANEL_MAX_H : ATTR_COLLAPSED_H,
                  zIndex: 22,
                  padding: 12,
                  boxSizing: "border-box",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 18,
                  background: "rgba(7,10,18,0.92)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  fontFamily: "ui-sans-serif, system-ui",
                  lineHeight: 1.25,
                  overflow: "hidden",
                  pointerEvents: "auto",
                  transition: "height 220ms ease",
                }
          }
        >
          {/* Header always visible and toggles open/closed */}
          <button
            onClick={() => setAttrsOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
              padding: 0,
              border: "none",
              background: "transparent",
              color: "white",
              cursor: "pointer",
              textAlign: "left",
            }}
            title={attrsOpen ? "Collapse attributes" : "Expand attributes"}
          >
            <div
              style={{
                fontSize: 12,
                opacity: 0.85,
                letterSpacing: "0.10em",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              ATTRIBUTES <span style={{ opacity: 0.65, fontSize: 12 }}>{attrsOpen ? "▴" : "▾"}</span>
            </div>
            <div style={{ fontSize: 10, opacity: 0.6 }}>{attrsOpen ? `Showing ${attrsCapped.length}/${MAX_ATTRS}` : null}</div>
          </button>

          {attrsOpen ? (
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: ATTR_PANEL_GAP,
                overflow: "hidden",
                alignContent: "start",
                flex: 1,
              }}
            >
              {attrsCapped.map((a, idx) => {
                const k = a?.trait_type ?? a?.traitType ?? `Attribute ${idx + 1}`;
                const v = a?.value;
                return <AttrTileSmall key={`${k}-${idx}`} k={k} v={v} />;
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ✅ CANVAS ON TOP visually, but cannot steal clicks/typing */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingBottom: bottomPad,
          boxSizing: "border-box",
          zIndex: 30,
          pointerEvents: "none",
        }}
      >
        <Canvas style={{ pointerEvents: "none" }} camera={{ position: [0, 0, 3.2], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.25} />
          <directionalLight position={[3, 4, 2]} intensity={1.35} />
          <pointLight position={[-3, -2, 2]} intensity={0.7} />

          {/* 🌌 Starfield ONLY when COHERENT + verified/bound */}
          <Starfield enabled={mode === "COHERENT" && isBound} />

          {/* ✨ Transaction sparks still only RENDER when COHERENT + bound (even though we listen when connected) */}
          <TransactionSparks enabled={mode === "COHERENT" && isBound} event={sparkEvent} />

          <EnergonCube beat={beat} mode={mode} rarityTier={rarityTier} isGenesis={isGenesis} isBound={isBound} />
          <Environment preset="city" />
        </Canvas>
      </div>
    </div>
  );
}

export default function ObserverPage() {
  const mounted = useMounted();
  if (!mounted) return null;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ObserverInner />
      </QueryClientProvider>
    </WagmiProvider>
  );
}