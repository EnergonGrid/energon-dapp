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

// Narrow screen sheet sizing (still bottom-docked; no scroll)
const SHEET_INSET = 12;
const SHEET_H = 320;

// Minimal ABIs (read-only)
const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
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

  { type: "function", name: "tokenURI", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "tokenOfOwnerByIndex", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
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

  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`;
  }

  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

  if (uri.startsWith("bafy") || uri.startsWith("Qm")) {
    return `https://ipfs.io/ipfs/${uri}`;
  }

  return uri;
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

function EnergonCube({ beat, mode, rarityTier, isGenesis }) {
  const groupRef = useRef(null);

  const cubeMatRef = useRef(null);
  const sphereMatRef = useRef(null);
  const edgeMatRef = useRef(null);

  const pulse = useRef(0);

  // Base palette
  const baseColor = useMemo(() => new THREE.Color("#0B1020"), []);
  const sphereBaseColor = useMemo(() => new THREE.Color("#0A0A0C"), []); // ✅ black-ish sphere base
  const edgeBaseColor = useMemo(() => new THREE.Color("#22324A"), []);

  const tmpColor = useMemo(() => new THREE.Color("#000000"), []);
  const rainbowColors = useMemo(() => GENESIS_RAINBOW.map((c) => new THREE.Color(c)), []);

  const pulseColorRef = useRef(new THREE.Color(RARITY_COLORS.Common));

  // ✅ In SILENT or FRACTURED => render sphere-only (no cube, no edges)
  const sphereOnly = mode === "SILENT" || mode === "FRACTURED";

  // Lock base model materials (once)
  const baseLocked = useRef(false);
  useEffect(() => {
    if (!sphereMatRef.current) return;
    if (baseLocked.current) return;

    // Sphere base
    sphereMatRef.current.color.copy(sphereBaseColor);
    sphereMatRef.current.emissive.copy(new THREE.Color("#000000"));
    sphereMatRef.current.emissiveIntensity = 0.12;
    sphereMatRef.current.roughness = 0.35;
    sphereMatRef.current.metalness = 0.05;

    // Cube + edges (if present)
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
      cubeMatRef.current.envMapIntensity = 1.35;
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

  // On each beat: set a NEW pulse color sharply (COHERENT only)
  useEffect(() => {
    if (mode !== "COHERENT") return;

    pulse.current = 1.0;

    if (isGenesis) {
      const i = Math.floor(Math.random() * rainbowColors.length);
      pulseColorRef.current.copy(rainbowColors[i]);
      return;
    }

    const tier = String(rarityTier || "Common");
    const hex = RARITY_COLORS[tier] || RARITY_COLORS.Common;
    pulseColorRef.current.set(hex);
  }, [beat, mode, rarityTier, isGenesis, rainbowColors]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    const isCoherent = mode === "COHERENT";
    const isFractured = mode === "FRACTURED";
    const isSilent = mode === "SILENT";
    const isDisconnected = mode === "DISCONNECTED";

    // Rotation / motion behavior
    const rotY = isFractured ? 0.55 : 0.12;
    const rotX = isFractured ? 0.22 : 0.04;

    // ✅ Keep fractured “random moments” even though it’s sphere-only:
    const shakeAmt = isFractured ? 0.055 : 0.0;
    const breatheSpeed = isFractured ? 3.6 : 0.9;

    const decay = isCoherent ? 2.4 : 1.35;
    pulse.current = Math.max(0, pulse.current - delta * decay);

    const breathe = 0.35 + 0.2 * Math.sin(t * breatheSpeed);
    const hit = pulse.current;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotY;
      groupRef.current.rotation.x += delta * rotX;

      if (isFractured) {
        // “Random-ish” jitter bursts
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

        const s = 1 + (isCoherent ? hit * 0.04 : 0);
        groupRef.current.scale.set(s, s, s);
      }
    }

    // Sphere look:
    if (sphereMatRef.current) {
      // Default: black sphere with subtle “alive” breathing
      sphereMatRef.current.color.copy(sphereBaseColor);

      if (isDisconnected || isSilent) {
        sphereMatRef.current.emissive.copy(new THREE.Color("#000000"));
        sphereMatRef.current.emissiveIntensity = 0.12 + breathe * 0.06;
      } else if (isFractured) {
        // fractured: black sphere but with random flicker intensity
        const flick = 0.5 + 0.5 * Math.sin(t * 14);
        sphereMatRef.current.emissive.copy(new THREE.Color("#000000"));
        sphereMatRef.current.emissiveIntensity = 0.12 + breathe * 0.08 + flick * 0.18;
      } else {
        // coherent: use pulse color
        sphereMatRef.current.emissive.copy(pulseColorRef.current);
        sphereMatRef.current.emissiveIntensity = 0.25 + breathe * 0.25 + hit * 4.0;
      }
    }

    // Cube + edges update (only if present and coherent/disconnected)
    if (!sphereOnly) {
      if (cubeMatRef.current) {
        cubeMatRef.current.color.copy(baseColor);
        cubeMatRef.current.opacity = 0.08;
        cubeMatRef.current.transmission = 0.35;
        cubeMatRef.current.depthWrite = false;

        if (isDisconnected || isSilent) {
          cubeMatRef.current.emissive.copy(baseColor);
          cubeMatRef.current.emissiveIntensity = 0.05 + breathe * 0.04;
        } else if (isFractured) {
          // (won’t run because sphereOnly for fractured)
          tmpColor.set("#FF3B3B").lerp(new THREE.Color("#FF9F1C"), 0.4);
          cubeMatRef.current.emissive.copy(tmpColor);
          cubeMatRef.current.emissiveIntensity = 0.12 + breathe * 0.25;
        } else {
          cubeMatRef.current.emissive.copy(pulseColorRef.current);
          cubeMatRef.current.emissiveIntensity = 0.06 + breathe * 0.08 + hit * 1.0;
        }
      }

      if (edgeMatRef.current) {
        edgeMatRef.current.color.copy(edgeBaseColor);
        edgeMatRef.current.opacity = 0.28 + breathe * 0.06;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* ✅ Sphere always exists */}
      <mesh>
        <sphereGeometry args={[0.38, 48, 48]} />
        <meshStandardMaterial ref={sphereMatRef} color={"#0A0A0C"} emissive={"#000000"} emissiveIntensity={0.12} roughness={0.35} metalness={0.05} />
      </mesh>

      {/* ✅ Only show cube + edges in COHERENT or DISCONNECTED (NOT SILENT / NOT FRACTURED) */}
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
              envMapIntensity={1.35}
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

  // Manual token input + touch flag (prevents autofill overwriting user typing)
  const [manualTokenId, setManualTokenId] = useState("");
  const [manualTouched, setManualTouched] = useState(false);

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

  // ✅ REAL mode only (preview removed)
  const mode = !isConnected ? "DISCONNECTED" : cubeN === 0 ? "SILENT" : cubeN === 1 ? "COHERENT" : "FRACTURED";

  useWatchBlockNumber({
    enabled: isConnected && mode === "COHERENT",
    onBlockNumber() {
      setBeat((b) => b + 1);
    },
  });

  // Auto tokenId (if enumerable)
  const tokenOfOwnerByIndex = useReadContract({
    abi: erc721Abi,
    address: CUBE_ADDRESS,
    functionName: "tokenOfOwnerByIndex",
    args: address ? [address, 0n] : undefined,
    query: { enabled: !!address && isConnected && mode === "COHERENT" },
  });

  // ✅ AUTOFILL: when we can read tokenOfOwnerByIndex, populate input once (unless user typed)
  useEffect(() => {
    if (!isConnected || mode !== "COHERENT") return;
    if (manualTouched) return;
    if (!tokenOfOwnerByIndex.isSuccess || tokenOfOwnerByIndex.data == null) return;

    const tidStr = safeBigIntToString(tokenOfOwnerByIndex.data);
    if (!tidStr) return;

    setManualTokenId((prev) => (prev.trim() ? prev : tidStr));
  }, [isConnected, mode, manualTouched, tokenOfOwnerByIndex.isSuccess, tokenOfOwnerByIndex.data]);

  // Reset manual state when leaving coherent or disconnecting
  useEffect(() => {
    if (!isConnected || mode !== "COHERENT") {
      setManualTokenId("");
      setManualTouched(false);
    }
  }, [isConnected, mode]);

  // Parse manual input
  const manualTokenIdClean = manualTokenId.trim();
  const manualTokenIdValid = /^\d+$/.test(manualTokenIdClean);

  // Candidate tokenId:
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
    if (!isConnected || mode !== "COHERENT" || !address || candidateTokenId == null) return { ok: false, status: "IDLE", owner: null };
    if (ownerOfRead.isLoading) return { ok: false, status: "CHECKING", owner: null };
    if (ownerOfRead.isError) return { ok: false, status: "NOT_MINTED", owner: null };
    if (ownerOfRead.isSuccess) {
      const owner = ownerOfRead.data;
      if (sameAddr(owner, address)) return { ok: true, status: "OWNED", owner };
      return { ok: false, status: "NOT_OWNED", owner };
    }
    return { ok: false, status: "IDLE", owner: null };
  }, [isConnected, mode, address, candidateTokenId, ownerOfRead.isLoading, ownerOfRead.isError, ownerOfRead.isSuccess, ownerOfRead.data]);

  const derivedTokenId = ownership.ok ? candidateTokenId : null;

  // Clear NFT data whenever token becomes invalid/changes
  useEffect(() => {
    setTokenUri(null);
    setMeta(null);
    setMetaErr(null);
    setLoadingMeta(false);
  }, [derivedTokenId]);

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

  // Fetch metadata JSON only when owned + tokenUri exists
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

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Metadata fetch failed (${res.status})`);

        const json = await res.json();
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

  const isGenesis = useMemo(() => {
    const tid = derivedTokenId != null ? safeBigIntToString(derivedTokenId) : "";
    if (tid === "1") return true;
    const g = attrMap["Genesis Status"] || attrMap["Genesis Type"] || attrMap["Genesis"];
    return !!g;
  }, [derivedTokenId, attrMap]);

  const tokenIdStr = useMemo(() => (derivedTokenId != null ? safeBigIntToString(derivedTokenId) : ""), [derivedTokenId]);
  const rarityLabel = useMemo(() => (tokenIdStr === "1" ? "Genesis" : rarityTier), [tokenIdStr, rarityTier]);

  const eonText = formatUnitsSafe(eonBal.data, decimals.data);

  const showAttributes = mode === "COHERENT" && derivedTokenId != null && meta && !metaErr;
  const bottomPad = showAttributes && isNarrow ? SHEET_H + SHEET_INSET * 2 : 0;

  const ownershipMsg = useMemo(() => {
    if (mode !== "COHERENT" || candidateTokenId == null) return null;
    if (ownerOfRead.isLoading) return { text: "Checking ownership…", color: "rgba(255,255,255,0.70)" };
    if (ownership.status === "NOT_MINTED") return { text: "Not minted / invalid tokenId.", color: "#ff8a3d" };
    if (ownership.status === "NOT_OWNED") return { text: "Token is not owned by this wallet.", color: "#ff8a3d" };
    if (ownership.status === "OWNED") return { text: "Owned ✓", color: "rgba(150,255,190,0.9)" };
    return null;
  }, [mode, candidateTokenId, ownerOfRead.isLoading, ownership.status]);

  return (
    <div style={{ height: "100vh", background: "#070A12", color: "white", position: "relative", overflow: "hidden" }}>
      {/* LEFT HUD (clickable) */}
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ letterSpacing: "0.22em", fontSize: 12, opacity: 0.75 }}>ENERGON GUARDIAN</div>
            <div style={{ fontSize: 20, marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
              Observer Dashboard <StatusPill mode={mode} />
            </div>
          </div>

          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
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
              onClick={() => disconnect()}
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
                {beat} {isConnected && mode !== "COHERENT" ? <span style={{ opacity: 0.6 }}>(locked)</span> : null}
              </div>
            </div>
          </div>

          {/* COHERENT-only NFT viewer */}
          {mode === "COHERENT" ? (
            <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.82 }}>
                  Token ID:{" "}
                  <span style={{ opacity: 0.98, fontWeight: 600 }}>
                    {derivedTokenId != null
                      ? safeBigIntToString(derivedTokenId)
                      : candidateTokenId != null
                      ? safeBigIntToString(candidateTokenId)
                      : tokenOfOwnerByIndex.isLoading
                      ? "…"
                      : "—"}
                  </span>
                  {isGenesis ? <span style={{ marginLeft: 10, opacity: 0.75 }}>(Genesis)</span> : null}
                </div>

                <div style={{ fontSize: 12, opacity: 0.82 }}>
                  Rarity: <span style={{ opacity: 0.98, fontWeight: 600 }}>{derivedTokenId ? rarityLabel : "—"}</span>
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
                    border: manualTokenId && !manualTokenIdValid ? "1px solid rgba(255,70,70,0.65)" : "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.25)",
                    color: "white",
                    outline: "none",
                  }}
                />
                {manualTokenId && !manualTokenIdValid ? (
                  <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75, color: "#ff8a3d" }}>Digits only.</div>
                ) : null}
                {ownershipMsg ? <div style={{ marginTop: 8, fontSize: 12, color: ownershipMsg.color, opacity: 0.95 }}>{ownershipMsg.text}</div> : null}
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
            </div>
          ) : null}

          {/* FRACTURED helper text */}
          {mode === "FRACTURED" ? (
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              Fractured mode: more than 1 cube detected. (Metadata display disabled by design.)
            </div>
          ) : null}
        </div>
      </div>

      {/* ATTRIBUTES */}
      {showAttributes ? (
        <div
          style={
            isNarrow
              ? {
                  position: "absolute",
                  left: SHEET_INSET,
                  right: SHEET_INSET,
                  bottom: SHEET_INSET,
                  height: SHEET_H,
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
                }
              : {
                  position: "absolute",
                  right: ATTR_PANEL_INSET,
                  bottom: ATTR_PANEL_INSET,
                  width: ATTR_PANEL_W,
                  maxHeight: ATTR_PANEL_MAX_H,
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
                }
          }
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.85, letterSpacing: "0.10em" }}>ATTRIBUTES</div>
            <div style={{ fontSize: 10, opacity: 0.6 }}>
              Showing {attrsCapped.length}/{MAX_ATTRS}
            </div>
          </div>

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

          <EnergonCube beat={beat} mode={mode} rarityTier={rarityTier} isGenesis={isGenesis} />
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