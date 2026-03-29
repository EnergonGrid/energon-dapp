import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useReadContract, useWatchBlockNumber } from "wagmi";

// --- YOUR CONTRACTS (Flare) ---
const EON_ADDRESS = "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79";
const CUBE_ADDRESS = "0x30e1076bDf2B123B54486C2721125388af2d2061";

// ✅ Controller address (locked fallback)
const CONTROLLER_ADDRESS_LOCKED = "0xc737bDcA9aFc57a1277480c3DFBF5bdbEcb54BB6";

// ✅ Global spark trigger
const SPARK_MILESTONE = 100;

// --- LAYOUT SETTINGS ---
const NARROW_BREAKPOINT = 1100;
const MAX_ATTRS = 10;

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
];

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

export default function useObserverState() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [viewMode, setViewMode] = useState("CUBE");

  const [beat, setBeat] = useState(0);
  const [sparkEvent, setSparkEvent] = useState(null);

  const lastSparkAt = useRef(0);
  const emitSpark = (next) => {
    const now = Date.now();
    if (now - lastSparkAt.current < 120) return;
    lastSparkAt.current = now;
    setSparkEvent(next);
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
    if (!tokenOfOwnerByIndex.isSuccess || tokenOfOwnerByIndex.data == null) return;

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

  const rarityTier = useMemo(() => {
    const r = attrMap["Rarity Tier"];
    return r ? String(r) : "Common";
  }, [attrMap]);

  const tokenIdStr = useMemo(
    () => (derivedTokenId != null ? safeBigIntToString(derivedTokenId) : ""),
    [derivedTokenId]
  );

  const isGenesis = useMemo(() => {
    if (tokenIdStr === "1") return true;
    const g =
      attrMap["Genesis Status"] ||
      attrMap["Genesis Type"] ||
      attrMap["Genesis"];
    return !!g;
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

  return {
    // wallet
    address,
    isConnected,
    connect,
    disconnect,

    // view
    viewMode,
    setViewMode,

    // scene
    beat,
    sparkEvent,
    mode,
    isBound,
    rarityTier,
    isGenesis,

    // HUD
    hudOpen,
    setHudOpen,
    cubeCount,
    cubeN,
    eonText,
    totalMintedN,

    // token panel
    tokenPanelOpen,
    setTokenPanelOpen,
    manualTokenId,
    setManualTokenId,
    setManualTouched,
    manualTokenIdValid,
    displayedCandidateId,
    tokenIdStr,
    rarityLabel,
    ownershipMsg,
    derivedTokenId,
    loadingMeta,
    metaErr,
    meta,

    // attributes
    attrsOpen,
    setAttrsOpen,
    attrsCapped,
    canShowAttributes,
    isNarrow,
    bottomPad,

    // helpers/constants needed by page/panels
    shortAddr,
    MAX_ATTRS,
    SHEET_INSET,
    SHEET_H,
  };
}