import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

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

import EnergonCube from "../components/observer/scene/EnergonCube";
import ShockwaveRing from "../components/observer/scene/ShockwaveRing";
import TransactionSparks from "../components/observer/scene/TransactionSparks";
import EnergonField from "../components/observer/scene/EnergonField";
import GridScene from "../components/observer/scene/GridScene";
import HalvingMemoryOrb from "../components/observer/scene/HalvingMemoryOrb";
import EnergonEnergyFilaments from "../components/observer/scene/EnergonEnergyFilaments";
import ObserverHud from "../components/observer/panels/ObserverHud";
import AttributesPanel from "../components/observer/panels/AttributesPanel";

// --- YOUR CONTRACTS (Flare) ---
const EON_ADDRESS = "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79";
const CUBE_ADDRESS = "0x30e1076bDf2B123B54486C2721125388af2d2061";

// ✅ Controller address (locked fallback)
const CONTROLLER_ADDRESS_LOCKED = "0xc737bDcA9aFc57a1277480c3DFBF5bdbEcb54BB6";

// ✅ Global spark trigger
const SPARK_MILESTONE = 100;

// ✅ Protocol memory settings
const MAX_SUPPLY = 1000000;
const ENERGON_BLOCK_TIME_SECONDS = 600;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

// ✅ IMPORTANT: set this to the actual deployed constructor value if it ever changes
const INITIAL_REWARD_PER_BLOCK_WEI = 25n * 10n ** 18n;

// ✅ Optional UI test override
const TEST_FORCE_HALVING_STAGE = null;

// ✅ Filament speed while touching archive memory
const FILAMENT_ACTIVE_PULSE_SPEED = 1.35;

// ✅ Hide protocol clock UI, but keep all logic/data alive
const SHOW_PROTOCOL_CLOCK = false;

// --- LAYOUT SETTINGS ---
const NARROW_BREAKPOINT = 1100;
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 980;
const MAX_ATTRS = 10;

const ATTR_PANEL_W = 420;
const ATTR_PANEL_INSET = 16;
const ATTR_PANEL_GAP = 8;
const ATTR_PANEL_MAX_H = 360;

const ATTR_COLLAPSED_H = 44;
const SHEET_COLLAPSED_H = 52;

const SHEET_INSET = 12;
const SHEET_H = 320;

// Minimal ABIs
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
];

const erc721Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
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
];

const cubeMiniAbi = [
  {
    type: "function",
    name: "controller",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "totalMinted",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const controllerMiniAbi = [
  {
    type: "function",
    name: "energonHeight",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "launchTime",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lastHalvingTime",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "halvingInterval",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "currentRewardPerBlock",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
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

function formatEonWei(value) {
  try {
    const v = typeof value === "bigint" ? value : BigInt(value || 0);
    return formatUnitsSafe(v, 18);
  } catch {
    return "—";
  }
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

function ipfsToHttps(uri) {
  if (!uri) return null;

  if (uri.startsWith("ipfs://")) {
    const cidPath = uri.replace("ipfs://", "");
    return `https://ipfs.io/ipfs/${cidPath}`;
  }

  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

  if (uri.startsWith("bafy") || uri.startsWith("Qm")) {
    return `https://ipfs.io/ipfs/${uri}`;
  }

  return uri;
}

async function fetchJsonWithGatewayFallback(url) {
  const gateways = [
    url,
    url?.includes("https://ipfs.io/ipfs/")
      ? url.replace(
          "https://ipfs.io/ipfs/",
          "https://cloudflare-ipfs.com/ipfs/"
        )
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

function countMaxHalvings(initialRewardWei) {
  let reward = initialRewardWei;
  let count = 0;
  while (reward > 0n) {
    reward /= 2n;
    count += 1;
  }
  return count;
}

function buildHalvingRecords({
  currentStage,
  launchTimeSec,
  halvingIntervalSec,
  initialRewardPerBlockWei,
}) {
  const safeStage = Math.max(0, Number(currentStage) || 0);
  const interval = Math.max(1, Number(halvingIntervalSec) || 1);
  const launch = Math.max(0, Number(launchTimeSec) || 0);

  const blocksPerEra = Math.floor(interval / ENERGON_BLOCK_TIME_SECONDS);
  const yearsPerHalving = interval / SECONDS_PER_YEAR;

  const records = [];
  let rewardBefore = initialRewardPerBlockWei;
  let cumulativeRewardWei = 0n;

  for (let idx = 0; idx < safeStage; idx += 1) {
    const halvingIndex = idx + 1;
    const halvingTimestamp = launch + halvingIndex * interval;

    cumulativeRewardWei += BigInt(blocksPerEra) * rewardBefore;
    const rewardAfter = rewardBefore / 2n;

    records.push({
      halvingIndex,
      halvingTimestamp,
      yearsFromLaunch: Number((yearsPerHalving * halvingIndex).toFixed(2)),
      rewardBeforeWei: rewardBefore,
      rewardAfterWei: rewardAfter,
      estimatedEnergonHeight: blocksPerEra * halvingIndex,
      estimatedCumulativeRewardsWei: cumulativeRewardWei,
    });

    rewardBefore = rewardAfter;
  }

  return records;
}

function formatHalvingDate(unixSeconds) {
  if (!unixSeconds) return "—";
  try {
    return new Date(Number(unixSeconds) * 1000).toLocaleDateString();
  } catch {
    return "—";
  }
}

function formatCountdown(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function OrbitalMemoryNode({
  record,
  rarityTier,
  isGenesis,
  filamentEnabled,
  filamentPulseSpeed,
  onActiveChange,
}) {
  const [position, setPosition] = useState([1.75, 0.35, -0.8]);

  const seed = useMemo(() => {
    const h = Math.max(0, Number(record.halvingTimestamp) || 0);
    const i = Math.max(1, Number(record.halvingIndex) || 1);

    if (i === 1) {
      return {
        baseX: -1.95,
        baseY: 1.15,
        baseZ: -1.65,
        orbitRadius: 0.16,
        yWave: 0.1,
        zWave: 0.08,
        speed: 0.22,
        phase: 0.7,
      };
    }

    if (i === 2) {
      return {
        baseX: 2.25,
        baseY: 0.45,
        baseZ: -1.55,
        orbitRadius: 0.14,
        yWave: 0.09,
        zWave: 0.07,
        speed: 0.18,
        phase: 1.9,
      };
    }

    if (i === 3) {
      return {
        baseX: 2.65,
        baseY: -1.15,
        baseZ: -1.85,
        orbitRadius: 0.15,
        yWave: 0.1,
        zWave: 0.08,
        speed: 0.16,
        phase: 3.1,
      };
    }

    const r1 = (Math.sin(h * 0.00017 + i * 1.13) + 1) * 0.5;
    const r2 = (Math.sin(h * 0.00011 + i * 2.41) + 1) * 0.5;
    const r3 = (Math.sin(h * 0.00007 + i * 3.77) + 1) * 0.5;

    let baseX = -3.1 + r1 * 6.2;
    let baseY = -1.6 + r2 * 3.2;
    let baseZ = -2.2 + r3 * 1.6;

    const minDistanceFromCenter = 2.45;
    const dist = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ);

    if (dist < minDistanceFromCenter) {
      const scale = minDistanceFromCenter / Math.max(dist, 0.001);
      baseX *= scale;
      baseY *= scale;
      baseZ *= scale;
    }

    return {
      baseX,
      baseY,
      baseZ,
      orbitRadius: 0.1 + r1 * 0.08,
      yWave: 0.06 + r2 * 0.06,
      zWave: 0.05 + r3 * 0.05,
      speed: 0.12 + r2 * 0.08,
      phase: r3 * Math.PI * 2,
    };
  }, [record.halvingTimestamp, record.halvingIndex]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    const orbitX = Math.sin(t * seed.speed + seed.phase) * seed.orbitRadius;
    const orbitY = Math.cos(t * seed.speed * 1.15 + seed.phase) * seed.yWave;
    const orbitZ = Math.sin(t * seed.speed * 0.82 + seed.phase) * seed.zWave;

    setPosition([
      seed.baseX + orbitX,
      seed.baseY + orbitY,
      seed.baseZ + orbitZ,
    ]);
  });

  return (
    <>
      <EnergonEnergyFilaments
        enabled={filamentEnabled}
        active={filamentEnabled}
        rarityTier={rarityTier}
        from={[0, 0, 0]}
        to={position}
        pulseSpeed={filamentPulseSpeed}
      />

      <HalvingMemoryOrb
        halvingIndex={record.halvingIndex}
        halvingHeight={record.halvingTimestamp}
        mintedAtHalving={record.estimatedEnergonHeight}
        guardians={record.yearsFromLaunch}
        eonReleased={Number(record.estimatedCumulativeRewardsWei / 10n ** 18n)}
        maxSupply={MAX_SUPPLY}
        rarityTier={rarityTier}
        isGenesis={isGenesis}
        position={position}
        onActiveChange={(active) => {
          onActiveChange(active, record, record.halvingIndex);
        }}
      />
    </>
  );
}

function OrbitalMemorySystem({
  enabled,
  rarityTier,
  isGenesis,
  records,
  activeOrbHalvingIndex,
  onActiveChange,
}) {
  if (!enabled || !records.length) return null;

  return (
    <>
      {records.map((record) => {
        const isFocused = activeOrbHalvingIndex === record.halvingIndex;

        return (
          <OrbitalMemoryNode
            key={`memory-orb-${record.halvingIndex}`}
            record={record}
            rarityTier={rarityTier}
            isGenesis={isGenesis}
            filamentEnabled={isFocused}
            filamentPulseSpeed={FILAMENT_ACTIVE_PULSE_SPEED}
            onActiveChange={onActiveChange}
          />
        );
      })}
    </>
  );
}

function ObserverInner() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [viewMode, setViewMode] = useState("CUBE");

  const [beat, setBeat] = useState(0);
  const [sparkEvent, setSparkEvent] = useState(null);
  const [halvingInfo, setHalvingInfo] = useState(null);
  const [activeOrbHalvingIndex, setActiveOrbHalvingIndex] = useState(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const lastSparkAt = useRef(0);
  const emitSpark = (next) => {
    const now = Date.now();
    if (now - lastSparkAt.current < 120) return;
    lastSparkAt.current = now;
    setSparkEvent({
      ...next,
      id: now + Math.random(),
    });
  };

  const [hudOpen, setHudOpen] = useState(true);
  const [manualTokenId, setManualTokenId] = useState("");
  const [manualTouched, setManualTouched] = useState(false);
  const [tokenPanelOpen, setTokenPanelOpen] = useState(true);
  const [attrsOpen, setAttrsOpen] = useState(false);

  const [tokenUri, setTokenUri] = useState(null);
  const [meta, setMeta] = useState(null);
  const [metaErr, setMetaErr] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [isNarrow, setIsNarrow] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1280);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setIsNarrow(w < NARROW_BREAKPOINT);
      setViewportWidth(w);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = viewportWidth < MOBILE_BREAKPOINT;
  const isTablet = viewportWidth < TABLET_BREAKPOINT;

  useEffect(() => {
    const id = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const cubeCount = useReadContract({
    abi: erc721Abi,
    address: CUBE_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const totalMintedRead = useReadContract({
    abi: cubeMiniAbi,
    address: CUBE_ADDRESS,
    functionName: "totalMinted",
    query: { enabled: true, refetchInterval: 5000 },
  });

  const totalMintedN = useMemo(() => {
    try {
      const v = totalMintedRead.data;
      if (typeof v === "bigint") {
        const max = BigInt(Number.MAX_SAFE_INTEGER);
        return v > max ? Number.MAX_SAFE_INTEGER : Number(v);
      }
      if (typeof v === "number") return v;
      return 0;
    } catch {
      return 0;
    }
  }, [totalMintedRead.data]);

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

  const mode = !isConnected
    ? "DISCONNECTED"
    : cubeN === 0
      ? "SILENT"
      : cubeN === 1
        ? "COHERENT"
        : "FRACTURED";

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

  useEffect(() => {
    if (!isConnected || mode !== "COHERENT") return;
    if (manualTouched) return;
    if (!tokenOfOwnerByIndex.isSuccess || tokenOfOwnerByIndex.data == null)
      return;

    const tidStr = safeBigIntToString(tokenOfOwnerByIndex.data);
    if (!tidStr) return;

    setManualTokenId((prev) => (prev.trim() ? prev : tidStr));
  }, [
    isConnected,
    mode,
    manualTouched,
    tokenOfOwnerByIndex.isSuccess,
    tokenOfOwnerByIndex.data,
  ]);

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
      setHudOpen(true);
      setHalvingInfo(null);
      setActiveOrbHalvingIndex(null);
    }
  }, [isConnected, mode]);

  const manualTokenIdClean = manualTokenId.trim();
  const manualTokenIdValid = /^\d+$/.test(manualTokenIdClean);

  const candidateTokenId = useMemo(() => {
    if (mode !== "COHERENT") return null;

    if (manualTokenIdValid) return BigInt(manualTokenIdClean);

    if (tokenOfOwnerByIndex.isSuccess && tokenOfOwnerByIndex.data != null) {
      return tokenOfOwnerByIndex.data;
    }

    return null;
  }, [
    mode,
    manualTokenIdValid,
    manualTokenIdClean,
    tokenOfOwnerByIndex.isSuccess,
    tokenOfOwnerByIndex.data,
  ]);

  const ownerOfRead = useReadContract({
    abi: erc721Abi,
    address: CUBE_ADDRESS,
    functionName: "ownerOf",
    args: candidateTokenId != null ? [candidateTokenId] : undefined,
    query: {
      enabled:
        !!address &&
        isConnected &&
        mode === "COHERENT" &&
        candidateTokenId != null,
    },
  });

  const ownership = useMemo(() => {
    if (
      !isConnected ||
      mode !== "COHERENT" ||
      !address ||
      candidateTokenId == null
    ) {
      return { ok: false, status: "IDLE", owner: null };
    }

    if (ownerOfRead.isLoading) {
      return { ok: false, status: "CHECKING", owner: null };
    }

    if (ownerOfRead.isError) {
      return { ok: false, status: "NOT_MINTED", owner: null };
    }

    if (ownerOfRead.isSuccess) {
      const owner = ownerOfRead.data;
      if (sameAddr(owner, address)) {
        return { ok: true, status: "OWNED", owner };
      }
      return { ok: false, status: "NOT_OWNED", owner };
    }

    return { ok: false, status: "IDLE", owner: null };
  }, [
    isConnected,
    mode,
    address,
    candidateTokenId,
    ownerOfRead.isLoading,
    ownerOfRead.isError,
    ownerOfRead.isSuccess,
    ownerOfRead.data,
  ]);

  const derivedTokenId = ownership.ok ? candidateTokenId : null;
  const isBound = mode === "COHERENT" && derivedTokenId != null;

  useEffect(() => {
    if (isBound) setTokenPanelOpen(false);
  }, [isBound]);

  const tokenUriRead = useReadContract({
    abi: erc721Abi,
    address: CUBE_ADDRESS,
    functionName: "tokenURI",
    args: derivedTokenId != null ? [derivedTokenId] : undefined,
    query: { enabled: mode === "COHERENT" && derivedTokenId != null },
  });

  useEffect(() => {
    if (tokenUriRead.isSuccess && tokenUriRead.data) {
      setTokenUri(tokenUriRead.data);
    }
  }, [tokenUriRead.isSuccess, tokenUriRead.data]);

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

  const tokenIdStr = useMemo(
    () => (derivedTokenId != null ? safeBigIntToString(derivedTokenId) : ""),
    [derivedTokenId]
  );

  const isGenesis = useMemo(() => {
    return tokenIdStr === "1";
  }, [tokenIdStr]);

  const rarityTier = useMemo(() => {
    if (tokenIdStr === "1") return "Genesis";

    const r =
      attrMap["Rarity Tier"] ??
      attrMap["Rarity"] ??
      attrMap["rarityTier"];

    return r ? String(r) : "Common";
  }, [tokenIdStr, attrMap]);

  const rarityLabel = useMemo(
    () => (tokenIdStr === "1" ? "Genesis" : rarityTier),
    [tokenIdStr, rarityTier]
  );

  const eonText = formatUnitsSafe(eonBal.data, decimals.data);

  const canShowAttributes = isBound && meta && !metaErr;
  const bottomPad =
    canShowAttributes && isNarrow && attrsOpen ? SHEET_H + SHEET_INSET * 2 : 0;

  const ownershipMsg = useMemo(() => {
    if (mode !== "COHERENT" || candidateTokenId == null) return null;
    if (ownerOfRead.isLoading) {
      return { text: "Checking ownership…", color: "rgba(255,255,255,0.70)" };
    }
    if (ownership.status === "NOT_MINTED") {
      return { text: "Not minted / invalid tokenId.", color: "#ff8a3d" };
    }
    if (ownership.status === "NOT_OWNED") {
      return { text: "Token is not owned by this wallet.", color: "#ff8a3d" };
    }
    if (ownership.status === "OWNED") {
      return { text: "Owned ✓", color: "rgba(150,255,190,0.9)" };
    }
    return null;
  }, [mode, candidateTokenId, ownerOfRead.isLoading, ownership.status]);

  useWatchBlockNumber({
    enabled: isConnected && mode === "COHERENT" && isBound,
    onBlockNumber() {
      setBeat((b) => b + 1);
    },
  });

  useEffect(() => {
    if (!(isConnected && mode === "COHERENT" && isBound)) return;

    const id = setInterval(() => {
      setBeat((b) => b + 1);
    }, 2400);

    return () => clearInterval(id);
  }, [isConnected, mode, isBound]);

  const controllerAddrRead = useReadContract({
    abi: cubeMiniAbi,
    address: CUBE_ADDRESS,
    functionName: "controller",
    query: { enabled: true },
  });

  const controllerAddress = useMemo(() => {
    const addr = controllerAddrRead?.data;
    if (
      typeof addr === "string" &&
      addr &&
      addr !== "0x0000000000000000000000000000000000000000"
    ) {
      return addr;
    }
    return CONTROLLER_ADDRESS_LOCKED;
  }, [controllerAddrRead?.data]);

  const heightRead = useReadContract({
    abi: controllerMiniAbi,
    address: controllerAddress,
    functionName: "energonHeight",
    query: {
      enabled: !!controllerAddress,
      refetchInterval: 5000,
    },
  });

  const launchTimeRead = useReadContract({
    abi: controllerMiniAbi,
    address: controllerAddress,
    functionName: "launchTime",
    query: {
      enabled: !!controllerAddress,
      refetchInterval: 60000,
    },
  });

  const halvingIntervalRead = useReadContract({
    abi: controllerMiniAbi,
    address: controllerAddress,
    functionName: "halvingInterval",
    query: {
      enabled: !!controllerAddress,
      refetchInterval: 60000,
    },
  });

  const rewardPerBlockRead = useReadContract({
    abi: controllerMiniAbi,
    address: controllerAddress,
    functionName: "currentRewardPerBlock",
    query: {
      enabled: !!controllerAddress,
      refetchInterval: 60000,
    },
  });

  const lastHalvingTimeRead = useReadContract({
    abi: controllerMiniAbi,
    address: controllerAddress,
    functionName: "lastHalvingTime",
    query: {
      enabled: !!controllerAddress,
      refetchInterval: 60000,
    },
  });

  const currentHeight = useMemo(() => {
    try {
      const v = heightRead.data;
      if (typeof v === "bigint") return Number(v);
      if (typeof v === "number") return v;
      return 0;
    } catch {
      return 0;
    }
  }, [heightRead.data]);

  const launchTimeSec = useMemo(() => {
    try {
      const v = launchTimeRead.data;
      if (typeof v === "bigint") return Number(v);
      if (typeof v === "number") return v;
      return 0;
    } catch {
      return 0;
    }
  }, [launchTimeRead.data]);

  const halvingIntervalSec = useMemo(() => {
    try {
      const v = halvingIntervalRead.data;
      if (typeof v === "bigint") return Number(v);
      if (typeof v === "number") return v;
      return 4 * SECONDS_PER_YEAR;
    } catch {
      return 4 * SECONDS_PER_YEAR;
    }
  }, [halvingIntervalRead.data]);

  const lastHalvingTimeSec = useMemo(() => {
    try {
      const v = lastHalvingTimeRead.data;
      if (typeof v === "bigint") return Number(v);
      if (typeof v === "number") return v;
      return launchTimeSec;
    } catch {
      return launchTimeSec;
    }
  }, [lastHalvingTimeRead.data, launchTimeSec]);

  const currentRewardPerBlockWei = useMemo(() => {
    try {
      const v = rewardPerBlockRead.data;
      if (typeof v === "bigint") return v;
      if (typeof v === "number") return BigInt(v);
      return INITIAL_REWARD_PER_BLOCK_WEI;
    } catch {
      return INITIAL_REWARD_PER_BLOCK_WEI;
    }
  }, [rewardPerBlockRead.data]);

  const maxHalvingCount = useMemo(() => {
    return countMaxHalvings(INITIAL_REWARD_PER_BLOCK_WEI);
  }, []);

  const scheduledHalvingStage = useMemo(() => {
    if (!launchTimeSec || !halvingIntervalSec) return 0;
    if (nowSec <= launchTimeSec) return 0;

    const elapsed = nowSec - launchTimeSec;
    return Math.min(maxHalvingCount, Math.floor(elapsed / halvingIntervalSec));
  }, [nowSec, launchTimeSec, halvingIntervalSec, maxHalvingCount]);

  const currentHalvingStage =
    TEST_FORCE_HALVING_STAGE ?? scheduledHalvingStage;

  const halvingRecords = useMemo(() => {
    return buildHalvingRecords({
      currentStage: currentHalvingStage,
      launchTimeSec,
      halvingIntervalSec,
      initialRewardPerBlockWei: INITIAL_REWARD_PER_BLOCK_WEI,
    });
  }, [currentHalvingStage, launchTimeSec, halvingIntervalSec]);

  const currentRewardPerBlockText = useMemo(() => {
    return formatEonWei(currentRewardPerBlockWei);
  }, [currentRewardPerBlockWei]);

  const nextHalvingTimestamp = useMemo(() => {
    if (!lastHalvingTimeSec || !halvingIntervalSec) return 0;
    return lastHalvingTimeSec + halvingIntervalSec;
  }, [lastHalvingTimeSec, halvingIntervalSec]);

  const nextHalvingCountdownSec = useMemo(() => {
    if (!nextHalvingTimestamp) return 0;
    return Math.max(0, nextHalvingTimestamp - nowSec);
  }, [nextHalvingTimestamp, nowSec]);

  const nextHalvingCountdownText = useMemo(() => {
    if (currentRewardPerBlockWei <= 0n) return "Complete";
    return formatCountdown(nextHalvingCountdownSec);
  }, [nextHalvingCountdownSec, currentRewardPerBlockWei]);

  const lastMilestoneRef = useRef(null);
  const burstTimerRef = useRef(null);

  useEffect(() => {
    if (!isConnected) return;
    if (!isBound) return;
    if (!heightRead?.data) return;

    if (burstTimerRef.current) {
      clearInterval(burstTimerRef.current);
      burstTimerRef.current = null;
    }

    function startPulseBurst() {
      const total = 18;
      const gapMs = 60;
      let i = 0;

      burstTimerRef.current = setInterval(() => {
        emitSpark({
          direction: Math.random() > 0.5 ? "in" : "out",
          isReward: Math.random() > 0.5,
        });

        i += 1;
        if (i >= total) {
          clearInterval(burstTimerRef.current);
          burstTimerRef.current = null;
        }
      }, gapMs);
    }

    const h = Number(heightRead.data);
    if (!Number.isFinite(h) || h <= 0) return;

    const milestoneIndex = Math.floor((h - 1) / SPARK_MILESTONE);

    if (lastMilestoneRef.current == null) {
      lastMilestoneRef.current = milestoneIndex;
      return;
    }

    if (milestoneIndex > lastMilestoneRef.current) {
      lastMilestoneRef.current = milestoneIndex;
      startPulseBurst();
    }

    return () => {
      if (burstTimerRef.current) {
        clearInterval(burstTimerRef.current);
        burstTimerRef.current = null;
      }
    };
  }, [isConnected, isBound, heightRead?.data]);

  const displayedCandidateId = useMemo(() => {
    if (candidateTokenId != null) return safeBigIntToString(candidateTokenId);
    return "—";
  }, [candidateTokenId]);

  // ✅ GRID uses one stable camera only.
  // ✅ GridScene.js is now the single source of truth for desktop/mobile grid sizing.
  const cameraConfig = useMemo(() => {
    if (viewMode === "GRID") {
      if (isMobile) return { position: [0, 0, 1.0], fov: 65 };
      if (isTablet) return { position: [0, 0, 1.0], fov: 60 };
      return { position: [0, 0, 2.2], fov: 60 };
    }

    if (isMobile) return { position: [0, 0, 4.9], fov: 58 };
    if (isTablet) return { position: [0, 0, 4.0], fov: 50 };
    return { position: [0, 0, 3.2], fov: 45 };
  }, [viewMode, isMobile, isTablet]);

  const cameraKey = `${viewMode}-${isMobile ? "mobile" : isTablet ? "tablet" : "desktop"}`;

  const mobileGridExtraBottom =
    isMobile && viewMode === "GRID"
      ? canShowAttributes && attrsOpen
        ? SHEET_H + 86
        : 86
      : 0;

  const canvasPaddingTop = isMobile ? 8 : 0;
  const canvasPaddingBottom = isMobile ? 8 + mobileGridExtraBottom : 0;

  return (
    <div
      style={{
        height: "100vh",
        background: "#070A12",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 60,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            position: "absolute",
            left: isMobile ? 10 : 0,
            top: isMobile ? 10 : 0,
            transform: isMobile
              ? "scale(0.86)"
              : isTablet
                ? "scale(0.93)"
                : "scale(1)",
            transformOrigin: "top left",
            maxWidth: isMobile ? "calc(100vw - 20px)" : "none",
          }}
        >
          <ObserverHud
            hudOpen={hudOpen}
            setHudOpen={setHudOpen}
            mode={mode}
            isConnected={isConnected}
            address={address}
            connect={connect}
            disconnect={disconnect}
            viewMode={viewMode}
            setViewMode={setViewMode}
            cubeCount={cubeCount}
            cubeN={cubeN}
            eonText={eonText}
            beat={beat}
            isBound={isBound}
            totalMintedN={totalMintedN}
            tokenPanelOpen={tokenPanelOpen}
            setTokenPanelOpen={setTokenPanelOpen}
            tokenIdStr={tokenIdStr}
            rarityLabel={rarityLabel}
            displayedCandidateId={displayedCandidateId}
            isGenesis={isGenesis}
            manualTokenId={manualTokenId}
            setManualTokenId={setManualTokenId}
            setManualTouched={setManualTouched}
            manualTokenIdValid={manualTokenIdValid}
            ownershipMsg={ownershipMsg}
            derivedTokenId={derivedTokenId}
            loadingMeta={loadingMeta}
            metaErr={metaErr}
            meta={meta}
            shortAddr={shortAddr}
          />
        </div>

        {hudOpen && SHOW_PROTOCOL_CLOCK && !isMobile && (
          <div
            style={{
              position: "absolute",
              left: 20,
              top: 440,
              zIndex: 65,
              width: 270,
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(10,14,24,0.72)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              fontSize: 12,
              lineHeight: 1.55,
              backdropFilter: "blur(10px)",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Protocol Clock
            </div>
            <div>Launch: {formatHalvingDate(launchTimeSec)}</div>
            <div>
              Halving Interval:{" "}
              {(halvingIntervalSec / SECONDS_PER_YEAR).toFixed(2)} years
            </div>
            <div>Next Halving In: {nextHalvingCountdownText}</div>
            <div>
              Next Halving Date: {formatHalvingDate(nextHalvingTimestamp)}
            </div>
            <div>Reward / Block: {currentRewardPerBlockText} EON</div>
            <div>Energon Height: {currentHeight}</div>
          </div>
        )}

        <div style={{ pointerEvents: "auto" }}>
          <AttributesPanel
            canShowAttributes={canShowAttributes}
            isNarrow={isNarrow}
            attrsOpen={attrsOpen}
            setAttrsOpen={setAttrsOpen}
            attrsCapped={attrsCapped}
            maxAttrs={MAX_ATTRS}
            sheetInset={SHEET_INSET}
            sheetH={SHEET_H}
            sheetCollapsedH={SHEET_COLLAPSED_H}
            attrPanelInset={ATTR_PANEL_INSET}
            attrPanelW={ATTR_PANEL_W}
            attrPanelMaxH={ATTR_PANEL_MAX_H}
            attrCollapsedH={ATTR_COLLAPSED_H}
            attrPanelGap={ATTR_PANEL_GAP}
          />
        </div>

        {halvingInfo && !isMobile && (
          <div
            style={{
              position: "absolute",
              right: 24,
              top: 90,
              zIndex: 70,
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(10,14,24,0.78)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              fontSize: 13,
              lineHeight: 1.5,
              backdropFilter: "blur(10px)",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Halving Memory
            </div>
            <div>Index: {halvingInfo.halvingIndex}</div>
            <div>Date: {formatHalvingDate(halvingInfo.halvingTimestamp)}</div>
            <div>Years From Launch: {halvingInfo.yearsFromLaunch}</div>
            <div>
              Reward After: {formatEonWei(halvingInfo.rewardAfterWei)} EON
            </div>
            <div>Est. Energon Height: {halvingInfo.estimatedEnergonHeight}</div>
            <div>
              Est. Rewards Released:{" "}
              {formatEonWei(halvingInfo.estimatedCumulativeRewardsWei)} EON
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingBottom: bottomPad + canvasPaddingBottom,
          paddingTop: canvasPaddingTop,
          boxSizing: "border-box",
          zIndex: 30,
          pointerEvents: "auto",
        }}
      >
        <Canvas
          key={cameraKey}
          style={{ pointerEvents: "auto" }}
          camera={cameraConfig}
          dpr={isMobile ? [1, 1.5] : [1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          {viewMode === "GRID" ? (
            <group>
              <GridScene
                coherent={isConnected && mode === "COHERENT"}
                totalMinted={totalMintedN}
                gridSeedKey={CUBE_ADDRESS}
                connectedWalletAddress={address}
                connectedCubeRarity={rarityTier}
                connectedIsGenesis={isGenesis}
              />
            </group>
          ) : (
            <group position={isMobile ? [0, -0.12, 0] : [0, 0, 0]}>
              <ambientLight intensity={0.25} />
              <directionalLight position={[3, 4, 2]} intensity={1.35} />
              <pointLight position={[-3, -2, 2]} intensity={0.7} />

              <EnergonField enabled={mode === "COHERENT" && isBound} />

              <TransactionSparks
                enabled={mode === "COHERENT" && isBound}
                event={sparkEvent}
              />

              <ShockwaveRing
                enabled={mode === "COHERENT" && isBound}
                beat={beat}
              />

              <EnergonCube
                beat={beat}
                mode={mode}
                rarityTier={rarityTier}
                isGenesis={isGenesis}
                isBound={isBound}
                totalMinted={totalMintedN}
                maxSupply={MAX_SUPPLY}
                halvingStage={currentHalvingStage}
                scale={isMobile ? 1 : 2.15}
              />

              <OrbitalMemorySystem
                enabled={mode === "COHERENT" && isBound}
                rarityTier={rarityTier}
                isGenesis={isGenesis}
                records={halvingRecords}
                activeOrbHalvingIndex={activeOrbHalvingIndex}
                onActiveChange={(active, info, halvingIndex) => {
                  if (active) {
                    setHalvingInfo(info);
                    setActiveOrbHalvingIndex(halvingIndex);
                  } else {
                    setHalvingInfo((prev) =>
                      prev?.halvingIndex === halvingIndex ? null : prev
                    );
                    setActiveOrbHalvingIndex((prev) =>
                      prev === halvingIndex ? null : prev
                    );
                  }
                }}
              />

              <Environment preset="city" />
            </group>
          )}
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