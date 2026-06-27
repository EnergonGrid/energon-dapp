import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import Nav from "../components/Nav";
import {
  ABI,
  CONTRACT_ADDRESS,
  MAINNET_CHAIN_ID,
  NETWORK_NAME,
  RPCS,
} from "../lib/contract";

const EON_ADDRESS = "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79";

const CONTROLLER_ADDRESS_LOCKED =
  "0xc737bDcA9aFc57a1277480c3DFBF5bdbEcb54BB6";

const TOTAL_BURN_POOL = 5_250_000n * 10n ** 18n;

const EON_ICON_URI =
  "https://red-secret-dragonfly-529.mypinata.cloud/ipfs/bafybeiccfdp4aez6gqva5yx5cmixc7dugqxl6eee5nhb54sdhpnidpmt7u";

const TICK_PENDING_KEY = "energon_tick_pending_tx";
const TICK_LOCK_KEY = "energon_tick_lock_until";

const POLL_INTERVAL_MS = 30000;
const PENDING_CHECK_INTERVAL_MS = 7000;
const AUTO_TICK_INTERVAL_MS = 6000;
const READ_FAILURE_ROTATE_THRESHOLD = 3;

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const THREE_MONTHS_SECONDS = 90 * 24 * 60 * 60;

const MOBILE_BREAKPOINT = 760;
const SMALL_PHONE_BREAKPOINT = 430;

const LOCKED_CUBE_ADDRESS =
  "0x30e1076bDf2B123B54486C2721125388af2d2061";

const LOCKED_CONTROLLER_ADDRESS =
  "0xc737bDcA9aFc57a1277480c3DFBF5bdbEcb54BB6";

const LOCKED_EON_ADDRESS =
  "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79";

function assertLockedContractAddresses(controllerAddress = CONTROLLER_ADDRESS_LOCKED) {
  if (CONTRACT_ADDRESS.toLowerCase() !== LOCKED_CUBE_ADDRESS.toLowerCase()) {
    throw new Error("Security check failed: Cube contract mismatch");
  }

  if (controllerAddress.toLowerCase() !== LOCKED_CONTROLLER_ADDRESS.toLowerCase()) {
    throw new Error("Security check failed: Controller contract mismatch");
  }

  if (EON_ADDRESS.toLowerCase() !== LOCKED_EON_ADDRESS.toLowerCase()) {
    throw new Error("Security check failed: EON contract mismatch");
  }
}

const CONTROLLER_ABI = [
  "function energonHeight() view returns (uint256)",
  "function secondsUntilNextEnergonBlock() view returns (uint256)",
  "function tickEnergon() external",
  "function burnPoolRemaining() view returns (uint256)",
  "function launchTime() view returns (uint256)",
  "function lastHalvingTime() view returns (uint256)",
  "function halvingInterval() view returns (uint256)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function getWalletChainId() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const hex = await window.ethereum.request({ method: "eth_chainId" });
  return parseInt(hex, 16);
}

function toUnpaddedHexChainId(id) {
  return `0x${Number(id).toString(16)}`;
}

function clampPct(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

function makeBurnBar(burnedRaw) {
  try {
    const burned =
      typeof burnedRaw === "bigint" ? burnedRaw : BigInt(burnedRaw || 0);
    const pct =
      TOTAL_BURN_POOL > 0n
        ? Number((burned * 10000n) / TOTAL_BURN_POOL) / 100
        : 0;

    const safePct = clampPct(pct);
    const totalSlots = 20;
    const filled = Math.max(
      0,
      Math.min(totalSlots, Math.round((safePct / 100) * totalSlots))
    );
    const empty = totalSlots - filled;

    return {
      pct: safePct,
      bar: `${"█".repeat(filled)}${"░".repeat(empty)}`,
    };
  } catch {
    return { pct: 0, bar: "░░░░░░░░░░░░░░░░░░░░" };
  }
}

function formatDateFromUnix(sec) {
  try {
    const n = Number(sec || 0);
    if (!Number.isFinite(n) || n <= 0) return "-";
    return new Date(n * 1000).toLocaleDateString();
  } catch {
    return "-";
  }
}

function formatCountdown(seconds) {
  const s = Math.max(0, Number(seconds || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function Dashboard() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState(
    "Ready. (Connect wallet for eligibility + balances)"
  );
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallPhone, setIsSmallPhone] = useState(false);

  const [totalMinted, setTotalMinted] = useState("-");

  const [cubeBal, setCubeBal] = useState("-");
  const [eligibleText, setEligibleText] = useState("-");
  const [eonBal, setEonBal] = useState("-");

  const [controllerAddr, setControllerAddr] = useState("-");
  const [energonHeight, setEnergonHeight] = useState("-");
  const [secondsUntilNext, setSecondsUntilNext] = useState("-");
  const [tickAllowed, setTickAllowed] = useState(false);

  const [launchTime, setLaunchTime] = useState(0);
  const [lastHalvingTime, setLastHalvingTime] = useState(0);
  const [halvingInterval, setHalvingInterval] = useState(0);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const [burnPoolRemaining, setBurnPoolRemaining] = useState("-");
  const [totalBurned, setTotalBurned] = useState("-");
  const [burnProgressBar, setBurnProgressBar] = useState("░░░░░░░░░░░░░░░░░░░░");
  const [burnProgressPct, setBurnProgressPct] = useState("0.00%");
  const [burnProgressPctValue, setBurnProgressPctValue] = useState(0);
  const [burnBlinkCount, setBurnBlinkCount] = useState(0);

  const [autoTickOn, setAutoTickOn] = useState(false);
  const [isTicking, setIsTicking] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [lastTickTx, setLastTickTx] = useState("");
  const [pendingTickTx, setPendingTickTx] = useState("");

  const [backoffMs, setBackoffMs] = useState(0);
  const backoffRef = useRef(0);

  const lastTickHeightRef = useRef(null);
  const accountRef = useRef("");
  const prevBurnedRef = useRef(null);
  const refreshInFlightRef = useRef(false);
  const readFailureCountRef = useRef(0);

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      setIsMobile(w <= MOBILE_BREAKPOINT);
      setIsSmallPhone(w <= SMALL_PHONE_BREAKPOINT);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    accountRef.current = account || "";
  }, [account]);

  useEffect(() => {
    const t = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const rpcList = useMemo(() => {
    const v = RPCS?.[MAINNET_CHAIN_ID];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === "string" && v) return [v];
    return [];
  }, []);

  const roRpcIndexRef = useRef(0);
  const roProviderRef = useRef(null);

  function makeRoProvider(index) {
    const url = rpcList[index % rpcList.length];
    return new ethers.JsonRpcProvider(url);
  }

  function getRoProvider() {
    if (!rpcList.length) return null;

    if (!roProviderRef.current) {
      roProviderRef.current = makeRoProvider(roRpcIndexRef.current);
    }

    return roProviderRef.current;
  }

  function rotateRpc(reason = "read failure") {
    if (rpcList.length <= 1) return;

    roRpcIndexRef.current = (roRpcIndexRef.current + 1) % rpcList.length;
    roProviderRef.current = null;
    readFailureCountRef.current = 0;

    console.warn(`Rotated public RPC due to ${reason}`);
  }

  function noteReadFailure(reason) {
    readFailureCountRef.current += 1;

    if (readFailureCountRef.current >= READ_FAILURE_ROTATE_THRESHOLD) {
      rotateRpc(reason);
    }
  }

  function noteReadSuccess() {
    readFailureCountRef.current = 0;
  }

  const walletConnected = !!account;
  const chainOk = walletConnected && Number(chainId) === MAINNET_CHAIN_ID;

  const shortAddr = (a) =>
    a ? `${a.slice(0, 6)}…${a.slice(a.length - 4)}` : "-";

  const nextHalvingTimestamp = useMemo(() => {
    const last = Number(lastHalvingTime || 0);
    const interval = Number(halvingInterval || 0);
    if (
      !Number.isFinite(last) ||
      !Number.isFinite(interval) ||
      last <= 0 ||
      interval <= 0
    ) {
      return 0;
    }
    return last + interval;
  }, [lastHalvingTime, halvingInterval]);

  const nextHalvingCountdownSeconds = useMemo(() => {
    if (!nextHalvingTimestamp) return 0;
    return Math.max(0, nextHalvingTimestamp - nowSec);
  }, [nextHalvingTimestamp, nowSec]);

  const nextHalvingCountdown = useMemo(() => {
    if (!nextHalvingTimestamp) return "-";
    return formatCountdown(nextHalvingCountdownSeconds);
  }, [nextHalvingTimestamp, nextHalvingCountdownSeconds]);

  const launchDateText = useMemo(
    () => formatDateFromUnix(launchTime),
    [launchTime]
  );

  const nextHalvingDateText = useMemo(
    () => formatDateFromUnix(nextHalvingTimestamp),
    [nextHalvingTimestamp]
  );

  function tile(label, value, extra = null, tileStyle = null, valueStyle = null) {
    return (
      <div style={{ ...styles.tile, ...(tileStyle || {}) }}>
        <div style={styles.tileLabel}>{label}</div>
        <div style={{ ...styles.tileValue, ...(valueStyle || {}) }}>{value}</div>
        {extra}
      </div>
    );
  }

  const burnTileVisual = useMemo(() => {
    const pct = clampPct(burnProgressPctValue);
    const flashOn = burnBlinkCount > 0 && burnBlinkCount % 2 === 1;
    const flashBoost = flashOn ? 0.28 : 0;

    return {
      background: `linear-gradient(180deg, rgba(54,36,18,0.56), rgba(20,14,9,0.86)),
        radial-gradient(circle at 22% 30%,
        rgba(255,214,138,${0.18 + pct / 180 + flashBoost * 0.45}) 0%,
        rgba(255,161,77,${0.12 + pct / 220 + flashBoost * 0.35}) 30%,
        rgba(255,95,45,${0.08 + pct / 250 + flashBoost * 0.22}) 58%,
        rgba(255,255,255,0.02) 100%)`,
      border: `1px solid rgba(255,181,110,${0.26 + pct / 280 + flashBoost * 0.2
        })`,
      boxShadow: `
        0 18px 34px rgba(0,0,0,0.30),
        0 0 ${24 + pct * 0.35 + (flashOn ? 22 : 0)}px rgba(255,173,88,${0.16 + flashBoost * 0.25
        }),
        inset 0 0 ${20 + pct * 0.15 + (flashOn ? 12 : 0)}px rgba(255,189,100,${0.09 + flashBoost * 0.18
        })
      `,
    };
  }, [burnProgressPctValue, burnBlinkCount]);

  const burnBarVisual = useMemo(() => {
    const pct = clampPct(burnProgressPctValue);
    const flashOn = burnBlinkCount > 0 && burnBlinkCount % 2 === 1;

    return {
      color: flashOn ? "rgba(255,245,214,0.98)" : "rgba(255,234,176,0.98)",
      textShadow: flashOn
        ? "0 0 12px rgba(255,230,170,0.72), 0 0 26px rgba(255,160,70,0.58), 0 0 44px rgba(255,110,40,0.36)"
        : `0 0 ${10 + pct * 0.14}px rgba(255,225,150,0.46), 0 0 ${22 + pct * 0.18
        }px rgba(255,150,60,0.24)`,
      filter: "brightness(1.08)",
    };
  }, [burnProgressPctValue, burnBlinkCount]);

  const clockPhase = useMemo(() => {
    if (!nextHalvingTimestamp) return "green";
    if (nextHalvingCountdownSeconds <= THREE_MONTHS_SECONDS) return "red";
    if (nextHalvingCountdownSeconds <= ONE_YEAR_SECONDS) return "burn";
    return "green";
  }, [nextHalvingTimestamp, nextHalvingCountdownSeconds]);

  const clockVisual = useMemo(() => {
    if (clockPhase === "red") {
      return {
        tile: {
          background:
            "linear-gradient(180deg, rgba(60,18,18,0.56), rgba(18,6,6,0.88)), radial-gradient(circle at 80% 20%, rgba(255,80,80,0.22), transparent 60%)",
          border: "1px solid rgba(255,90,90,0.35)",
          boxShadow:
            "0 18px 34px rgba(0,0,0,0.30), 0 0 30px rgba(255,60,60,0.25), inset 0 0 18px rgba(255,80,80,0.15)",
        },
        pill: {
          background:
            "linear-gradient(180deg, rgba(150,30,30,0.90), rgba(90,10,10,0.95))",
          border: "1px solid rgba(255,120,120,0.40)",
          color: "#fff",
          boxShadow: "0 0 18px rgba(255,80,80,0.40)",
        },
      };
    }

    if (clockPhase === "burn") {
      return {
        tile: burnTileVisual,
        pill: {
          background:
            "linear-gradient(180deg, rgba(70,90,180,0.90), rgba(30,50,120,0.95))",
          border: "1px solid rgba(120,170,255,0.40)",
          color: "#fff",
          boxShadow: "0 0 18px rgba(120,170,255,0.35)",
        },
      };
    }

    return {
      tile: {
        background:
          "linear-gradient(180deg, rgba(10,40,30,0.56), rgba(6,18,14,0.88)), radial-gradient(circle at 80% 20%, rgba(80,255,180,0.18), transparent 60%)",
        border: "1px solid rgba(80,255,180,0.28)",
        boxShadow:
          "0 18px 34px rgba(0,0,0,0.30), 0 0 26px rgba(80,255,180,0.18), inset 0 0 18px rgba(80,255,180,0.08)",
      },
      pill: {
        background:
          "linear-gradient(180deg, rgba(40,140,90,0.92), rgba(12,70,42,0.96))",
        border: "1px solid rgba(110,255,190,0.35)",
        color: "#fff",
        boxShadow: "0 0 16px rgba(80,255,180,0.25)",
      },
    };
  }, [clockPhase, burnTileVisual]);

  useEffect(() => {
    if (burnBlinkCount <= 0) return;

    const t = setTimeout(() => {
      setBurnBlinkCount((c) => Math.max(0, c - 1));
    }, 150);

    return () => clearTimeout(t);
  }, [burnBlinkCount]);

  function setCooldown(seconds) {
    setCooldownLeft(Math.max(0, Number(seconds || 0)));
  }

  function savePendingTickTx(hash) {
    try {
      if (!hash) return;
      localStorage.setItem(TICK_PENDING_KEY, hash);
      setPendingTickTx(hash);
    } catch {
      setPendingTickTx(hash);
    }
  }

  function clearPendingTickTx() {
    try {
      localStorage.removeItem(TICK_PENDING_KEY);
    } catch { }
    setPendingTickTx("");
  }

  function getStoredPendingTickTx() {
    try {
      return localStorage.getItem(TICK_PENDING_KEY) || "";
    } catch {
      return "";
    }
  }

  function lockTickForAllTabs(seconds = 45) {
    try {
      const until = Date.now() + seconds * 1000;
      localStorage.setItem(TICK_LOCK_KEY, String(until));
      return until;
    } catch {
      return 0;
    }
  }

  function isTickLocked() {
    try {
      const v = localStorage.getItem(TICK_LOCK_KEY) || "0";
      return Date.now() < Number(v);
    } catch {
      return false;
    }
  }

  function bumpBackoff() {
    const next =
      backoffRef.current === 0
        ? 15000
        : Math.min(backoffRef.current * 2, 120000);
    backoffRef.current = next;
    setBackoffMs(next);
    return next;
  }

  function clearBackoff() {
    backoffRef.current = 0;
    setBackoffMs(0);
  }

  function parseHeight(h) {
    const n = Number(String(h));
    return Number.isFinite(n) ? n : null;
  }

  function alreadyTickedThisHeight(currentHeight) {
    const h = parseHeight(currentHeight);
    if (h === null) return false;
    return lastTickHeightRef.current === h;
  }

  function markTickHeight(currentHeight) {
    const h = parseHeight(currentHeight);
    if (h === null) return;
    lastTickHeightRef.current = h;
  }

  async function readControllerAddressPublic() {
    const provider = getRoProvider();
    if (!provider) throw new Error("No public RPC available");

    const cube = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    try {
      const ctrl = await cube.controller();

      if (ctrl && ctrl !== ethers.ZeroAddress) {
        setControllerAddr(ctrl);
        return ctrl;
      }
    } catch (e) {
      console.warn("public controller read failed; using locked fallback", e);
      noteReadFailure("controller lookup failure");
    }

    setControllerAddr(CONTROLLER_ADDRESS_LOCKED);
    return CONTROLLER_ADDRESS_LOCKED;
  }

  useEffect(() => {
    const stored = getStoredPendingTickTx();
    if (stored) {
      setPendingTickTx(stored);
      setLastTickTx(stored);
      setStatus(`Tick pending — awaiting confirmation: ${stored}`);
    }
  }, []);

  useEffect(() => {
    if (!pendingTickTx) return;

    let stopped = false;

    async function checkPendingTick() {
      try {
        const provider = getRoProvider();
        if (!provider) return;

        const receipt = await provider.getTransactionReceipt(pendingTickTx);

        if (!receipt) {
          setStatus(`Tick pending — awaiting confirmation: ${pendingTickTx}`);
          return;
        }

        if (receipt.status === 1) {
          clearPendingTickTx();
          clearBackoff();
          setStatus("Tick confirmed ✅");
          await refreshRead(accountRef.current);
          return;
        }

        clearPendingTickTx();
        setStatus("Tick failed or reverted");
        await refreshRead(accountRef.current);
      } catch (e) {
        console.warn("pending tick check failed", e);
        noteReadFailure("pending tx receipt failure");
      }
    }

    checkPendingTick();

    const t = setInterval(() => {
      if (!stopped) checkPendingTick();
    }, PENDING_CHECK_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [pendingTickTx]);

  async function switchToMainnet() {
    if (!window.ethereum) return setStatus("MetaMask not found");

    const flareHex = toUnpaddedHexChainId(MAINNET_CHAIN_ID);
    const rpcUrlForWallet = rpcList[0] || RPCS?.[MAINNET_CHAIN_ID];

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: flareHex }],
      });

      const walletChainId = await getWalletChainId();
      setChainId(walletChainId);

      setStatus("Switched to Flare Mainnet ✅");
      await refreshRead(accountRef.current);
    } catch (err) {
      if (err?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: flareHex,
                chainName: NETWORK_NAME,
                nativeCurrency: {
                  name: "Flare",
                  symbol: "FLR",
                  decimals: 18,
                },
                rpcUrls: [rpcUrlForWallet],
                blockExplorerUrls: ["https://flarescan.com"],
              },
            ],
          });

          const walletChainId = await getWalletChainId();
          setChainId(walletChainId);

          setStatus("Added + switched to Flare Mainnet ✅");
          await refreshRead(accountRef.current);
        } catch (e2) {
          setStatus(e2?.message || "Failed to add chain");
        }
      } else {
        setStatus(err?.message || "Failed to switch chain");
      }
    }
  }

  async function connectWallet() {
    if (!window.ethereum) return setStatus("MetaMask not found");

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);

      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const addr = accounts?.[0] || "";

      const walletChainId = await getWalletChainId();
      setChainId(walletChainId);

      accountRef.current = addr;
      setAccount(addr);

      if (walletChainId !== MAINNET_CHAIN_ID) {
        setStatus(`Wrong network. Switch to ${NETWORK_NAME}.`);
        return;
      }

      setStatus("Connected ✅");
      await refreshRead(addr);
    } catch (e) {
      setStatus(e?.message || "Connect failed");
    }
  }

  async function refreshRead(optionalAccount = null) {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    try {
      const providerToUse = getRoProvider();
      if (!providerToUse) return;

      const cube = new ethers.Contract(CONTRACT_ADDRESS, ABI, providerToUse);

      const acct = optionalAccount || accountRef.current || account;

      const [totalMintedResult, controllerResult] = await Promise.allSettled([
        cube.totalMinted(),
        cube.controller(),
      ]);

      if (totalMintedResult.status === "fulfilled") {
        setTotalMinted(totalMintedResult.value.toString());
      } else {
        console.warn(
          "totalMinted read failed; keeping last value",
          totalMintedResult.reason
        );
        noteReadFailure("totalMinted failure");
      }

      let ctrl = CONTROLLER_ADDRESS_LOCKED;

      if (
        controllerResult.status === "fulfilled" &&
        controllerResult.value &&
        controllerResult.value !== ethers.ZeroAddress
      ) {
        ctrl = controllerResult.value;
      
        try {
          assertLockedContractAddresses(ctrl);
          setControllerAddr(ctrl);
        } catch (e) {
          console.error(e);
          ctrl = CONTROLLER_ADDRESS_LOCKED;
          setControllerAddr(CONTROLLER_ADDRESS_LOCKED);
        }
      } else {
        console.warn(
          "controller read failed; using locked fallback",
          controllerResult.reason
        );
        setControllerAddr(CONTROLLER_ADDRESS_LOCKED);
        noteReadFailure("controller failure");
      }

      const controller = new ethers.Contract(ctrl, CONTROLLER_ABI, providerToUse);

      const controllerReads = await Promise.allSettled([
        controller.energonHeight(),
        controller.secondsUntilNextEnergonBlock(),
        controller.launchTime(),
        controller.lastHalvingTime(),
        controller.halvingInterval(),
        controller.burnPoolRemaining(),
      ]);

      const [
        heightResult,
        secondsResult,
        launchTimeResult,
        lastHalvingResult,
        halvingIntervalResult,
        burnRemainingResult,
      ] = controllerReads;

      if (heightResult.status === "fulfilled") {
        setEnergonHeight(heightResult.value.toString());
      } else {
        console.warn(
          "energonHeight read failed; keeping last value",
          heightResult.reason
        );
        noteReadFailure("energonHeight failure");
      }

      if (secondsResult.status === "fulfilled") {
        const sec = Number(secondsResult.value.toString());
        setSecondsUntilNext(String(sec));
        setTickAllowed(sec === 0);
      } else {
        console.warn(
          "secondsUntilNext read failed; keeping last value",
          secondsResult.reason
        );
        noteReadFailure("secondsUntilNext failure");
      }

      if (launchTimeResult.status === "fulfilled") {
        setLaunchTime(Number(launchTimeResult.value.toString()));
      } else {
        console.warn(
          "launchTime read failed; keeping last value",
          launchTimeResult.reason
        );
        noteReadFailure("launchTime failure");
      }

      if (lastHalvingResult.status === "fulfilled") {
        setLastHalvingTime(Number(lastHalvingResult.value.toString()));
      } else {
        console.warn(
          "lastHalvingTime read failed; keeping last value",
          lastHalvingResult.reason
        );
        noteReadFailure("lastHalvingTime failure");
      }

      if (halvingIntervalResult.status === "fulfilled") {
        setHalvingInterval(Number(halvingIntervalResult.value.toString()));
      } else {
        console.warn(
          "halvingInterval read failed; keeping last value",
          halvingIntervalResult.reason
        );
        noteReadFailure("halvingInterval failure");
      }

      if (burnRemainingResult.status === "fulfilled") {
        const remaining = burnRemainingResult.value;
        const remainingBig =
          typeof remaining === "bigint"
            ? remaining
            : BigInt(remaining.toString());

        const burnedBig =
          TOTAL_BURN_POOL > remainingBig ? TOTAL_BURN_POOL - remainingBig : 0n;

        const { pct, bar } = makeBurnBar(burnedBig);

        setBurnPoolRemaining(`${ethers.formatUnits(remainingBig, 18)} EON`);
        setTotalBurned(`${ethers.formatUnits(burnedBig, 18)} EON`);
        setBurnProgressBar(bar);
        setBurnProgressPct(`${pct.toFixed(2)}%`);
        setBurnProgressPctValue(pct);

        if (
          prevBurnedRef.current !== null &&
          typeof prevBurnedRef.current === "bigint" &&
          burnedBig > prevBurnedRef.current
        ) {
          setBurnBlinkCount(6);
        }

        prevBurnedRef.current = burnedBig;
      } else {
        console.warn(
          "burnPoolRemaining read failed; keeping last value",
          burnRemainingResult.reason
        );
        noteReadFailure("burnPoolRemaining failure");
      }

      if (acct) {
        const eon = new ethers.Contract(EON_ADDRESS, ERC20_ABI, providerToUse);

        const [cubeBalanceResult, eonBalanceResult] = await Promise.allSettled([
          cube.balanceOf(acct),
          eon.balanceOf(acct),
        ]);

        if (cubeBalanceResult.status === "fulfilled") {
          const n = Number(cubeBalanceResult.value.toString());
          setCubeBal(String(n));
          if (n === 1) setEligibleText("Eligible ✅");
          else setEligibleText(`Not eligible ❌ (${n} Cubes)`);
        } else {
          console.warn(
            "cube balance read failed; keeping last value",
            cubeBalanceResult.reason
          );
          noteReadFailure("cube balance failure");
        }

        if (eonBalanceResult.status === "fulfilled") {
          setEonBal(`${ethers.formatUnits(eonBalanceResult.value, 18)} EON`);
        } else {
          console.warn(
            "EON balance read failed; keeping last value",
            eonBalanceResult.reason
          );
          noteReadFailure("EON balance failure");
        }
      } else {
        setCubeBal("-");
        setEligibleText("-");
        setEonBal("-");
      }

      if (controllerReads.some((r) => r.status === "fulfilled")) {
        noteReadSuccess();
      }
    } catch (e) {
      console.warn("Dashboard refresh failed; switching RPC", e);
      rotateRpc("full dashboard refresh failure");
      setStatus("Read delayed. Keeping last known values.");
    } finally {
      refreshInFlightRef.current = false;
    }
  }

  async function manualTick() {
    if (!window.ethereum) return setStatus("MetaMask not found");
    if (!accountRef.current) return setStatus("Connect wallet first");
    if (!chainOk) return setStatus(`Wrong network. Switch to ${NETWORK_NAME}.`);
    if (pendingTickTx) {
      return setStatus(`Tick pending — awaiting confirmation: ${pendingTickTx}`);
    }
    if (isTicking) return;
    if (cooldownLeft > 0) return setStatus(`Cooldown: wait ${cooldownLeft}s`);
    if (isTickLocked()) {
      return setStatus("Tick locked (another tab / recent tick). Try again soon.");
    }

    if (!tickAllowed) {
      return setStatus(
        "Tick not allowed yet. Wait for Next Block to reach 0 sec."
      );
    }

    if (alreadyTickedThisHeight(energonHeight)) {
      return setStatus(
        `Already ticked at height ${energonHeight}. Waiting for height to change…`
      );
    }

    let submittedHash = "";

    try {
      setIsTicking(true);
      setStatus("Submitting tick…");

      lockTickForAllTabs(45);
      setCooldown(20);
      markTickHeight(energonHeight);

      const ctrl = await readControllerAddressPublic();

      assertLockedContractAddresses(ctrl);

      const walletChainId = await getWalletChainId();
      setChainId(walletChainId);

      if (walletChainId !== MAINNET_CHAIN_ID) {
        setStatus(`Wrong network. Switch to ${NETWORK_NAME}.`);
        return;
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const controller = new ethers.Contract(ctrl, CONTROLLER_ABI, signer);

      const tx = await controller.tickEnergon();

      submittedHash = tx.hash;
      setLastTickTx(tx.hash);
      savePendingTickTx(tx.hash);

      setStatus(`Tick pending — awaiting confirmation: ${tx.hash}`);

      await tx.wait();

      clearPendingTickTx();
      clearBackoff();
      setStatus("Tick confirmed ✅");

      await refreshRead(accountRef.current);
    } catch (e) {
      const msg = e?.shortMessage || e?.message || "Tick failed";

      if (submittedHash) {
        setStatus(`Tick submitted. Waiting for chain confirmation: ${submittedHash}`);
      } else {
        try {
          localStorage.removeItem(TICK_LOCK_KEY);
        } catch {}
      
        clearPendingTickTx();
        setStatus(msg);
        bumpBackoff();
      }
    } finally {
      setIsTicking(false);
    }
  }

  useEffect(() => {
    let stopped = false;

    async function loop() {
      if (stopped) return;
      const acct = accountRef.current;

      if (!autoTickOn || !window.ethereum || !acct || !chainOk) return;

      if (pendingTickTx) {
        setStatus(`Tick pending — awaiting confirmation: ${pendingTickTx}`);
        return;
      }

      if (
        isTicking ||
        cooldownLeft > 0 ||
        isTickLocked() ||
        backoffRef.current > 0
      ) {
        return;
      }

      if (!tickAllowed) return;
      if (alreadyTickedThisHeight(energonHeight)) return;

      let submittedHash = "";

      try {
        setIsTicking(true);
        setStatus("Auto-tick: submitting…");

        lockTickForAllTabs(45);
        setCooldown(20);
        markTickHeight(energonHeight);

        const ctrl = await readControllerAddressPublic();

        assertLockedContractAddresses(ctrl);

        const walletChainId = await getWalletChainId();
        setChainId(walletChainId);

        if (walletChainId !== MAINNET_CHAIN_ID) {
          setStatus(`Wrong network. Switch to ${NETWORK_NAME}.`);
          return;
        }

        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const signer = await browserProvider.getSigner();
        const controller = new ethers.Contract(ctrl, CONTROLLER_ABI, signer);

        const tx = await controller.tickEnergon();

        submittedHash = tx.hash;
        setLastTickTx(tx.hash);
        savePendingTickTx(tx.hash);
        setStatus(`Auto-tick pending — awaiting confirmation: ${tx.hash}`);

        await tx.wait();

        clearPendingTickTx();
        clearBackoff();
        setStatus("Auto-tick confirmed ✅");
        await refreshRead(acct);
      } catch (e) {
        const msg = e?.shortMessage || e?.message || "Auto-tick failed";

        if (submittedHash) {
          setStatus(`Auto-tick submitted. Waiting for chain confirmation: ${submittedHash}`);
        } else {
          try {
            localStorage.removeItem(TICK_LOCK_KEY);
          } catch {}
        
          clearPendingTickTx();
          setStatus(msg);
          bumpBackoff();
        }
      } finally {
        setIsTicking(false);
      }
    }

    const interval = setInterval(loop, AUTO_TICK_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [
    autoTickOn,
    chainOk,
    tickAllowed,
    isTicking,
    cooldownLeft,
    energonHeight,
    pendingTickTx,
  ]);

  useEffect(() => {
    if (backoffMs <= 0) return;
    const t = setInterval(() => {
      backoffRef.current = Math.max(0, backoffRef.current - 1000);
      setBackoffMs(backoffRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [backoffMs]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => {
      setCooldownLeft((s) => Math.max(0, Number(s) - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownLeft]);

  useEffect(() => {
    refreshRead(accountRef.current);

    const t = setInterval(() => {
      refreshRead(accountRef.current);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const onChainChanged = async (chainIdHex) => {
      try {
        const walletChainId = parseInt(chainIdHex, 16);
        setChainId(walletChainId);

        if (walletChainId !== MAINNET_CHAIN_ID) {
          setStatus(`Wrong network. Switch to ${NETWORK_NAME}.`);
          setCubeBal("-");
          setEligibleText("-");
          setEonBal("-");
          return;
        }

        await refreshRead(accountRef.current);
      } catch (e) {
        setStatus(e?.message || "Chain update failed");
      }
    };

    const onAccountsChanged = async (accounts) => {
      try {
        const addr = accounts?.[0] || "";
        accountRef.current = addr;
        setAccount(addr);

        if (!addr) {
          setChainId(null);
          setCubeBal("-");
          setEligibleText("-");
          setEonBal("-");
          return;
        }

        const walletChainId = await getWalletChainId();
        setChainId(walletChainId);

        if (walletChainId !== MAINNET_CHAIN_ID) {
          setStatus(`Wrong network. Switch to ${NETWORK_NAME}.`);
          setCubeBal("-");
          setEligibleText("-");
          setEonBal("-");
          return;
        }

        await refreshRead(addr);
      } catch (e) {
        setStatus(e?.message || "Account update failed");
      }
    };

    window.ethereum.on("chainChanged", onChainChanged);
    window.ethereum.on("accountsChanged", onAccountsChanged);

    return () => {
      window.ethereum.removeListener("chainChanged", onChainChanged);
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
    };
  }, []);

  function tickBadge() {
    if (pendingTickTx) {
      return (
        <span style={{ ...styles.badge, ...styles.badgeWait }}>
          TICK PENDING
        </span>
      );
    }

    if (secondsUntilNext === "-") {
      return (
        <span style={{ ...styles.badge, ...styles.badgeUnknown }}>
          UNKNOWN
        </span>
      );
    }

    if (tickAllowed) {
      if (alreadyTickedThisHeight(energonHeight)) {
        return (
          <span style={{ ...styles.badge, ...styles.badgeWait }}>
            WAITING
          </span>
        );
      }
      return (
        <span style={{ ...styles.badge, ...styles.badgeOk }}>
          TICK ALLOWED
        </span>
      );
    }

    return (
      <span style={{ ...styles.badge, ...styles.badgeWait }}>
        NOT ALLOWED ({secondsUntilNext}s)
      </span>
    );
  }

  const gridStyle = isMobile ? styles.grid2 : styles.grid3;

  const wrapStyle = {
    ...styles.wrap,
    padding: isMobile ? "20px 14px 34px" : styles.wrap.padding,
  };

  const h1Style = {
    ...styles.h1,
    fontSize: isMobile ? (isSmallPhone ? 20 : 24) : 42,
    letterSpacing: isMobile ? 0.08 : 0.12,
  };

  const btnRowStyle = {
    ...styles.btnRow,
    gap: isMobile ? 10 : 12,
    marginBottom: isMobile ? 10 : 12,
  };

  const buttonBaseStyle = isMobile ? styles.btnMobile : null;

  return (
    <div
      style={{
        ...styles.page,
        ...(isMobile ? styles.pageMobile : null),
      }}
    >
      {!isMobile ? <div style={styles.bgGlowA} /> : null}
      {!isMobile ? <div style={styles.bgGlowB} /> : null}
      <div style={styles.bgStarsA} />
      <div style={styles.bgStarsB} />
      {!isMobile ? <div style={styles.circuitLeft} /> : null}
      {!isMobile ? <div style={styles.circuitRight} /> : null}

      <Nav />

      <div style={wrapStyle}>
        <div style={styles.headerBlock}>
          <h1 style={h1Style}>ENERGON DASHBOARD</h1>
          <div style={styles.headerGlowLine} />
        </div>

        <div style={btnRowStyle}>
          {!account ? (
            <button
              style={{ ...styles.btn, ...(buttonBaseStyle || {}) }}
              onClick={connectWallet}
              type="button"
            >
              Connect Wallet
            </button>
          ) : (
            <div
              style={{
                ...styles.connectedPill,
                ...(isMobile ? styles.connectedPillMobile : {}),
              }}
            >
              Wallet: {shortAddr(account)}
            </div>
          )}

          {!chainOk ? (
            <button
              style={{ ...styles.btnSecondary, ...(buttonBaseStyle || {}) }}
              onClick={switchToMainnet}
              type="button"
            >
              Switch to {NETWORK_NAME}
            </button>
          ) : null}

          <button
            style={{
              ...styles.btnPrimary,
              ...(buttonBaseStyle || {}),
              opacity: !account || !chainOk || pendingTickTx ? 0.5 : 1,
            }}
            onClick={() => setAutoTickOn((v) => !v)}
            disabled={!account || !chainOk || !!pendingTickTx}
            type="button"
          >
            Auto-Tick: {autoTickOn ? "ON" : "OFF"}
          </button>

          <button
            style={{
              ...styles.btnPrimary,
              ...(buttonBaseStyle || {}),
              opacity:
                !account ||
                  !chainOk ||
                  pendingTickTx ||
                  !tickAllowed ||
                  isTicking ||
                  cooldownLeft > 0 ||
                  alreadyTickedThisHeight(energonHeight)
                  ? 0.55
                  : 1,
            }}
            onClick={manualTick}
            disabled={
              !account ||
              !chainOk ||
              !!pendingTickTx ||
              !tickAllowed ||
              isTicking ||
              cooldownLeft > 0 ||
              alreadyTickedThisHeight(energonHeight)
            }
            type="button"
          >
            {pendingTickTx
              ? "Tick Pending…"
              : isTicking
                ? "Ticking…"
                : cooldownLeft > 0
                  ? `Cooldown ${cooldownLeft}s`
                  : alreadyTickedThisHeight(energonHeight)
                    ? "Waiting…"
                    : "Manual Tick"}
          </button>
        </div>

        {!isMobile ? (
          <div style={styles.subLine}>
            <span style={{ opacity: 0.88 }}>
              {backoffMs > 0 ? `Backoff: ${Math.ceil(backoffMs / 1000)}s` : ""}
              {lastTickTx ? ` • Last tick tx: ${shortAddr(lastTickTx)}` : ""}
            </span>
          </div>
        ) : null}

        <div style={gridStyle}>
          {tile(
            "Contract",
            shortAddr(CONTRACT_ADDRESS),
            null,
            null,
            isMobile ? styles.tileValueMobile : null
          )}

          {tile(
            "Network",
            !walletConnected
              ? `Wallet Not Connected\nNetwork: -`
              : chainOk
                ? `Flare Mainnet ✅\nChain ID: 14`
                : `Wrong Network ❌\nChain ID: ${chainId || "-"}`,
            null,
            null,
            {
              whiteSpace: "pre-line",
              ...(isMobile ? styles.tileValueMobile : {}),
            }
          )}

          <div
            style={{
              ...styles.tile,
              ...(isMobile ? styles.tileWideMobile : {}),
            }}
          >
            <div style={styles.tileLabel}>Energon Token (EON)</div>
            <div style={styles.eonRow}>
              <img src={EON_ICON_URI} alt="EON" style={styles.eonIconImg} />
              <div>
                <div
                  style={{
                    ...styles.eonTitle,
                    ...(isMobile ? styles.eonTitleMobile : {}),
                  }}
                >
                  EON
                </div>
                <div
                  style={{
                    ...styles.eonBalanceText,
                    ...(isMobile ? styles.eonBalanceTextMobile : {}),
                  }}
                >
                  Your Balance: {eonBal}
                </div>
              </div>
            </div>
          </div>

          {tile(
            "Your Cube Balance",
            cubeBal,
            null,
            null,
            isMobile ? styles.tileValueMobile : null
          )}

          {tile(
            "Eligibility",
            eligibleText,
            null,
            null,
            isMobile ? styles.tileValueMobile : null
          )}

          {tile(
            "Energon Height",
            energonHeight,
            null,
            null,
            isMobile ? styles.tileValueMobile : null
          )}

          {tile(
            "Next Block (sec)",
            secondsUntilNext,
            <div style={{ marginTop: 12 }}>{tickBadge()}</div>,
            null,
            isMobile ? styles.tileValueMobile : null
          )}

          <div
            style={{
              ...styles.tile,
              ...styles.burnTile,
              ...burnTileVisual,
              ...(isMobile ? styles.tileWideMobile : {}),
            }}
          >
            <div style={styles.tileLabel}>Burn Progress</div>
            <div style={styles.burnBarShell}>
              <div style={styles.burnBarHighlight} />
              <div
                style={{
                  ...styles.burnBar,
                  ...burnBarVisual,
                  ...(isMobile ? styles.burnBarMobile : {}),
                }}
              >
                {burnProgressBar}
              </div>
            </div>
            <div
              style={{
                ...styles.burnMeta,
                ...(isMobile ? styles.burnMetaMobile : {}),
              }}
            >
              {burnProgressPct} burned
              <br />
              Total Burned: {totalBurned}
              <br />
              Remaining: {burnPoolRemaining}
            </div>
          </div>

          <div
            style={{
              ...styles.tile,
              ...clockVisual.tile,
              ...(isMobile ? styles.tileWideMobile : {}),
            }}
          >
            <div style={styles.tileLabel}>Protocol Clock</div>

            <div
              style={{
                ...styles.clockMeta,
                ...(isMobile ? styles.clockMetaMobile : {}),
              }}
            >
              Launch Date: {launchDateText}
            </div>

            <div style={styles.clockCountdownWrap}>
              <div
                style={{
                  ...styles.clockCountdownPill,
                  ...clockVisual.pill,
                  ...(isMobile ? styles.clockCountdownPillMobile : {}),
                }}
              >
                {nextHalvingCountdown}
              </div>
            </div>

            <div
              style={{
                ...styles.clockMeta,
                ...(isMobile ? styles.clockMetaMobile : {}),
              }}
            >
              Next Halving Date: {nextHalvingDateText}
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.status,
            ...(isMobile ? styles.statusMobile : {}),
          }}
        >
          Status: {status}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 50% 14%, rgba(38,74,160,0.08) 0%, rgba(5,10,24,0.32) 18%, #000000 52%, #000000 100%)",
    color: "#fff",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  },

  pageMobile: {
    background: "#000000",
  },

  bgGlowA: {
    position: "absolute",
    top: 140,
    left: "18%",
    width: 360,
    height: 360,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(70,150,255,0.10), transparent 72%)",
    filter: "blur(90px)",
    pointerEvents: "none",
  },

  bgGlowB: {
    position: "absolute",
    right: "12%",
    top: 220,
    width: 300,
    height: 300,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(80,120,255,0.07), transparent 72%)",
    filter: "blur(90px)",
    pointerEvents: "none",
  },

  bgStarsA: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity: 0.26,
    backgroundImage:
      "radial-gradient(circle at 12% 18%, rgba(255,255,255,0.92) 0 1px, transparent 2px), radial-gradient(circle at 28% 9%, rgba(255,255,255,0.68) 0 1px, transparent 2px), radial-gradient(circle at 42% 14%, rgba(255,255,255,0.76) 0 1px, transparent 2px), radial-gradient(circle at 65% 10%, rgba(255,255,255,0.7) 0 1px, transparent 2px), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.6) 0 1px, transparent 2px), radial-gradient(circle at 88% 12%, rgba(255,255,255,0.74) 0 1px, transparent 2px)",
  },

  bgStarsB: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity: 0.12,
    backgroundImage:
      "radial-gradient(circle at 16% 42%, rgba(255,255,255,0.8) 0 1px, transparent 2px), radial-gradient(circle at 31% 50%, rgba(255,255,255,0.6) 0 1px, transparent 2px), radial-gradient(circle at 56% 36%, rgba(255,255,255,0.62) 0 1px, transparent 2px), radial-gradient(circle at 70% 48%, rgba(255,255,255,0.54) 0 1px, transparent 2px), radial-gradient(circle at 85% 58%, rgba(255,255,255,0.64) 0 1px, transparent 2px), radial-gradient(circle at 22% 72%, rgba(255,255,255,0.55) 0 1px, transparent 2px)",
  },

  circuitLeft: {
    position: "absolute",
    left: 0,
    top: 250,
    bottom: 0,
    width: 180,
    pointerEvents: "none",
    opacity: 0.12,
    background:
      "linear-gradient(transparent 0%, rgba(80,160,255,0.30) 10%, transparent 11%), linear-gradient(90deg, rgba(80,160,255,0.22), rgba(80,160,255,0.02)), linear-gradient(transparent 0%, transparent 58%, rgba(80,160,255,0.28) 58%, rgba(80,160,255,0.28) 59%, transparent 59%)",
  },

  circuitRight: {
    position: "absolute",
    right: 0,
    top: 250,
    bottom: 0,
    width: 180,
    pointerEvents: "none",
    opacity: 0.12,
    background:
      "linear-gradient(transparent 0%, rgba(80,160,255,0.30) 16%, transparent 17%), linear-gradient(270deg, rgba(80,160,255,0.22), rgba(80,160,255,0.02)), linear-gradient(transparent 0%, transparent 42%, rgba(80,160,255,0.28) 42%, rgba(80,160,255,0.28) 43%, transparent 43%)",
  },

  wrap: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "34px 18px 60px",
    position: "relative",
    zIndex: 1,
  },

  headerBlock: {
    marginBottom: 24,
    textAlign: "center",
  },

  h1: {
    margin: 0,
    fontSize: 42,
    lineHeight: 1.04,
    fontWeight: 500,
    letterSpacing: 0.12,
    color: "#ffffff",
    textTransform: "uppercase",
    textShadow:
      "0 0 8px rgba(255,255,255,0.04), 0 0 18px rgba(120,180,255,0.06)",
  },

  headerGlowLine: {
    marginTop: 12,
    height: 1,
    width: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(80,170,255,0.04), rgba(90,180,255,0.18), rgba(140,220,255,0.95), rgba(90,180,255,0.18), rgba(80,170,255,0.04))",
    boxShadow: "0 0 16px rgba(100,180,255,0.24)",
  },

  btnRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
    justifyContent: "flex-start",
  },

  subLine: {
    marginBottom: 14,
    fontSize: 13,
    color: "rgba(230,238,255,0.82)",
  },

  btn: {
    background:
      "linear-gradient(180deg, rgba(26,52,104,0.76), rgba(12,24,54,0.92))",
    border: "1px solid rgba(122,178,255,0.24)",
    color: "#eef6ff",
    padding: "11px 16px",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow:
      "0 10px 20px rgba(0,0,0,0.26), inset 0 0 0 1px rgba(255,255,255,0.02), 0 0 18px rgba(80,160,255,0.08)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },

  btnSecondary: {
    background:
      "linear-gradient(180deg, rgba(32,82,148,0.66), rgba(14,34,82,0.88))",
    border: "1px solid rgba(100,180,255,0.28)",
    color: "#eef6ff",
    padding: "11px 16px",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow:
      "0 10px 20px rgba(0,0,0,0.24), 0 0 18px rgba(80,160,255,0.10)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },

  btnPrimary: {
    background:
      "linear-gradient(180deg, rgba(36,74,142,0.74), rgba(16,36,88,0.92))",
    border: "1px solid rgba(110,185,255,0.30)",
    color: "#eef6ff",
    padding: "11px 16px",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow:
      "0 10px 20px rgba(0,0,0,0.24), 0 0 18px rgba(80,160,255,0.10)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },

  btnMobile: {
    width: "calc(50% - 5px)",
    minHeight: 46,
    fontSize: 14,
    padding: "11px 12px",
    textAlign: "center",
  },

  connectedPill: {
    background:
      "linear-gradient(180deg, rgba(18,36,80,0.76), rgba(10,20,48,0.94))",
    border: "1px solid rgba(110,180,255,0.18)",
    padding: "11px 14px",
    borderRadius: 999,
    fontSize: 13,
    color: "#dbeeff",
    boxShadow:
      "0 10px 20px rgba(0,0,0,0.22), 0 0 14px rgba(80,160,255,0.08)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },

  connectedPillMobile: {
    width: "100%",
    borderRadius: 14,
    textAlign: "center",
    fontSize: 13,
    padding: "12px 14px",
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginTop: 10,
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginTop: 10,
  },

  tile: {
    position: "relative",
    background:
      "linear-gradient(180deg, rgba(22,56,118,0.22), rgba(8,18,42,0.54))",
    border: "1px solid rgba(122,185,255,0.22)",
    borderRadius: 16,
    padding: 16,
    boxShadow:
      "0 16px 34px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.02), 0 0 18px rgba(60,135,255,0.07)",
    minHeight: 112,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  },

  tileWideMobile: {
    gridColumn: "span 2",
    minHeight: "auto",
  },

  burnTile: {
    minHeight: 148,
  },

  tileLabel: {
    fontSize: 14,
    marginBottom: 12,
    letterSpacing: 0.2,
    color: "rgba(225,236,255,0.92)",
  },

  tileValue: {
    fontSize: 18,
    fontWeight: 700,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    letterSpacing: 0.2,
    color: "#f2f7ff",
  },

  tileValueMobile: {
    fontSize: 16,
    lineHeight: 1.28,
  },

  burnBarShell: {
    position: "relative",
    display: "inline-block",
    padding: "2px 4px 4px 2px",
    maxWidth: "100%",
    overflow: "hidden",
  },

  burnBarHighlight: {
    position: "absolute",
    left: 4,
    right: 4,
    top: 2,
    height: 8,
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,245,205,0.28), rgba(255,255,255,0))",
    filter: "blur(5px)",
    pointerEvents: "none",
  },

  burnBar: {
    position: "relative",
    zIndex: 1,
    fontSize: 19,
    fontWeight: 900,
    letterSpacing: 1.25,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    marginBottom: 10,
    whiteSpace: "pre",
  },

  burnBarMobile: {
    fontSize: 13,
    letterSpacing: 0.55,
    marginBottom: 8,
  },

  burnMeta: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 1.55,
    color: "rgba(255,244,230,0.96)",
  },

  burnMetaMobile: {
    fontSize: 13,
    lineHeight: 1.45,
  },

  eonRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginTop: 2,
  },

  eonIconImg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    objectFit: "cover",
    flexShrink: 0,
    boxShadow: "0 0 16px rgba(70,120,255,0.16)",
    border: "1px solid rgba(110,180,255,0.18)",
    background: "rgba(10,20,48,0.82)",
  },

  eonTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#eef6ff",
  },

  eonTitleMobile: {
    fontSize: 17,
  },

  eonBalanceText: {
    opacity: 0.92,
    marginTop: 4,
    color: "rgba(236,243,255,0.92)",
  },

  eonBalanceTextMobile: {
    fontSize: 14,
    lineHeight: 1.35,
  },

  clockMeta: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 1.7,
    color: "rgba(236,243,255,0.94)",
  },

  clockMetaMobile: {
    fontSize: 13,
    lineHeight: 1.45,
  },

  clockCountdownWrap: {
    marginTop: 12,
    marginBottom: 12,
  },

  clockCountdownPill: {
    display: "inline-block",
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 1,
    padding: "8px 14px",
    borderRadius: 10,
  },

  clockCountdownPillMobile: {
    fontSize: 16,
    padding: "8px 12px",
    lineHeight: 1.2,
  },

  status: {
    marginTop: 14,
    fontSize: 15,
    color: "rgba(234,241,255,0.90)",
  },

  statusMobile: {
    fontSize: 14,
    lineHeight: 1.45,
    marginTop: 16,
    paddingBottom: 18,
  },

  badge: {
    display: "inline-block",
    padding: "8px 13px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.45,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    boxShadow: "0 0 14px rgba(255,255,255,0.04)",
    maxWidth: "100%",
  },

  badgeOk: {
    border: "1px solid rgba(70,230,190,0.34)",
    background: "rgba(45,190,170,0.14)",
    color: "#c9fff3",
    boxShadow: "0 0 18px rgba(70,230,190,0.12)",
  },

  badgeWait: {
    border: "1px solid rgba(255,200,80,0.32)",
    background: "rgba(255,200,80,0.10)",
    color: "#ffe7b0",
  },

  badgeUnknown: {
    border: "1px solid rgba(255,90,90,0.32)",
    background: "rgba(255,90,90,0.10)",
    color: "#ffd0d0",
  },
};