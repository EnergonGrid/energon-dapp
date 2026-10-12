import React, { useEffect, useMemo, useRef, useState } from "react";
import EmpLayout from "@/components/emp/EmpLayout";
import VaultStatePanel from "../components/emp/panels/VaultStatePanel";
import VaultBalancesPanel from "../components/emp/panels/VaultBalancesPanel";
import WalletBalancesPanel from "../components/emp/panels/WalletBalancesPanel";
import ActionsPanel from "../components/emp/panels/ActionsPanel";
import DeterministicPanel from "../components/emp/panels/DeterministicPanel";
import ProtocolDepositPanel from "../components/emp/panels/ProtocolDepositPanel";
import AccessStatePanel from "../components/emp/panels/AccessStatePanel";
import PendingClaimsPanel from "../components/emp/panels/PendingClaimsPanel";
import PastClaimsPanel from "../components/emp/panels/PastClaimsPanel";

import useEmpClaims from "../lib/emp/hooks/useEmpClaims";
import useEmpAccessState from "../lib/emp/hooks/useEmpAccessState";
import useEmpActions from "../lib/emp/hooks/useEmpActions";
import useEmpPricing from "@/lib/emp/hooks/useEmpPricing";
import useEmpCommits from "@/lib/emp/hooks/useEmpCommits";
import useEmpImpact from "@/lib/emp/hooks/useEmpImpact";
import useEmpCheckpoint from "@/lib/emp/hooks/useEmpCheckpoint";
import useEmpClaimActions from "@/lib/emp/hooks/useEmpClaimActions";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { injected } from "wagmi/connectors";

import EVaultArtifact from "@/abi/EVault.json";
const EVaultAbi = EVaultArtifact.abi;

import { erc20Abi } from "@/lib/emp/erc20Abi";
import {
  useEVaultState,
  formatUnitsSafe,
  parseUnitsSafe,
} from "@/lib/emp/hooks/useEVaultState";

function isAddr(a) {
  return typeof a === "string" && a.startsWith("0x") && a.length === 42;
}

function shortAddr(a) {
  if (!isAddr(a)) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function toBigIntSafe(v, fallback = 0n) {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(Math.trunc(v));
    if (typeof v === "string" && v.trim() !== "") return BigInt(v);
    return fallback;
  } catch {
    return fallback;
  }
}

function extractError(e) {
  const msg =
    e?.shortMessage ||
    e?.message ||
    e?.cause?.shortMessage ||
    e?.cause?.message ||
    "";

  const text = String(msg);

  if (text.includes("CooldownActive")) {
    return "Please wait before submitting again.";
  }
  if (text.includes("TooManyOpenClaims")) {
    return "You already have the maximum number of open claims.";
  }
  if (text.includes("GuardianThresholdNotMet")) {
    return "Access locked: synchronized coherent guardian threshold not met.";
  }
  if (text.includes("PriceImpactTooHigh")) {
    return "Submission blocked: this commit would push the effective EON price beyond the protocol’s allowed downward boundary for this direction. Reduce the amount and try again.";
  }
  if (text.includes("PriceChangePerHourTooHigh")) {
    return "Submission blocked: this amount would exceed the active 1-hour price window limit. Wait for the checkpoint reset or reduce the amount.";
  }
  if (text.includes("ClaimTooLarge")) {
    return "This claim is too large for current free reserves.";
  }
  if (text.includes("ClaimExpiredError")) return "This claim has expired.";
  if (text.includes("AlreadyExpired")) return "This claim is already expired.";
  if (text.includes("NotReady")) return "This claim is not ready yet.";
  if (text.includes("AlreadyClaimed"))
    return "This claim was already collected.";
  if (text.includes("NotClaimOwner")) {
    return "This claim belongs to a different wallet.";
  }
  if (text.includes("InsufficientReserve")) {
    return "Vault does not have enough free reserves.";
  }
  if (text.includes("MinReserveNotMet")) {
    return "Vault reserve minimum is not met.";
  }
  if (text.includes("Slippage")) {
    return "Price moved too much before confirmation. Try again.";
  }
  if (text.includes("BadAmount")) return "Enter a valid amount.";
  if (text.includes("PayoutWindowExceeded")) {
    return "Claim temporarily delayed because the current payout window budget has been reached. Please wait for the next payout window and try again.";
  }
  if (text.includes("CoreWithdrawForbidden")) {
    return "Core reserve assets cannot be withdrawn by controller. EON and USDT0 are constitutionally protected.";
  }
  if (text.includes("BadId")) return "This claim or record ID is invalid.";
  if (text.includes("BadFee")) return "Vault fee configuration is invalid.";
  if (text.includes("BadDecimals")) {
    return "Token decimals are not supported by this vault.";
  }
  if (text.includes("BadWithdrawToken")) {
    return "This token is not enabled for controller withdrawal. Only WFLR and FXRP are allowed.";
  }
  if (text.includes("BadRescueToken")) {
    return "Protected vault assets cannot be rescued with this function.";
  }
  if (text.includes("NotController")) {
    return "This action requires the active controller.";
  }
  if (text.includes("BadController")) return "Controller address is invalid.";
  if (text.includes("NoPendingController")) {
    return "There is no pending controller proposal.";
  }
  if (text.includes("ControllerDelayActive")) {
    return "Controller activation is still in delay.";
  }
  if (text.includes("WithdrawAuthorizationUsed")) {
    return "This withdrawal authorization was already executed.";
  }
  if (text.includes("WithdrawAuthorizationCancelledError")) {
    return "This withdrawal authorization was cancelled.";
  }
  if (text.includes("WithdrawAuthorizationMissing")) {
    return "This withdrawal authorization does not exist.";
  }
  if (text.includes("WithdrawAuthorizationNotTerminal")) {
    return "This withdrawal authorization cannot be pruned yet.";
  }
  if (text.includes("NotCoherentGuardian")) {
    return "Guardian access locked: wallet must hold exactly 1 cube.";
  }

  return msg || "Transaction failed";
}

function bnGte(a, b) {
  try {
    return (a ?? 0n) >= (b ?? 0n);
  } catch {
    return false;
  }
}

function parseUnitsOrZero(s, decimals) {
  const t = String(s ?? "").trim();
  if (!t) return 0n;
  try {
    return parseUnitsSafe(t, decimals);
  } catch {
    return 0n;
  }
}

function subClamp0(a, b) {
  try {
    return a > b ? a - b : 0n;
  } catch {
    return 0n;
  }
}

function maybeSyncApproveToCommit({
  commitStr,
  approveStr,
  decimals,
  setApprove,
}) {
  const c = String(commitStr ?? "").trim();
  if (!c) return;

  const a = String(approveStr ?? "").trim();

  const commitAmt = parseUnitsOrZero(c, decimals);
  if (commitAmt <= 0n) return;

  const approveAmt = parseUnitsOrZero(a, decimals);

  if (!a || approveAmt < commitAmt) {
    setApprove(c);
  }
}

function formatDurationShort(secLike) {
  try {
    const total = Number(secLike ?? 0);
    if (!Number.isFinite(total) || total <= 0) return "0s";

    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);

    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  } catch {
    return "—";
  }
}

function formatDurationVerbose(secLike) {
  try {
    const total = Number(secLike ?? 0);
    if (!Number.isFinite(total) || total <= 0) return "0 seconds";

    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);

    if (d > 0) {
      return `${d} day${d === 1 ? "" : "s"} ${h} hour${h === 1 ? "" : "s"}`;
    }
    if (h > 0) {
      return `${h} hour${h === 1 ? "" : "s"} ${m} minute${m === 1 ? "" : "s"}`;
    }
    if (m > 0) {
      return `${m} minute${m === 1 ? "" : "s"} ${s} second${s === 1 ? "" : "s"}`;
    }
    return `${s} second${s === 1 ? "" : "s"}`;
  } catch {
    return "—";
  }
}

function formatUnixTs(tsLike) {
  try {
    const n = Number(tsLike ?? 0);
    if (!Number.isFinite(n) || n <= 0) return "—";
    return new Date(n * 1000).toLocaleString();
  } catch {
    return "—";
  }
}

const FUTURE_FASSET_CONFIG = [
  {
    key: "FBTC",
    symbol: "FBTC",
    label: "FBTC",
    decimals: 8,
    address: "",
    live: false,
    contributionEnabled: false,
    withdrawalEnabled: false,
    note: "Future placeholder — activate when official Flare address is live.",
  },
  {
    key: "FLTC",
    symbol: "FLTC",
    label: "FLTC",
    decimals: 8,
    address: "",
    live: false,
    contributionEnabled: false,
    withdrawalEnabled: false,
    note: "Future placeholder — activate when official Flare address is live.",
  },
  {
    key: "FDOGE",
    symbol: "FDOGE",
    label: "FDOGE",
    decimals: 8,
    address: "",
    live: false,
    contributionEnabled: false,
    withdrawalEnabled: false,
    note: "Future placeholder — activate when official Flare address is live.",
  },
];

const PALETTE = {
  EON: {
    solid: "rgba(255, 196, 74, 0.94)",
    glow: "rgba(255, 196, 74, 0.22)",
    border: "rgba(255, 196, 74, 0.34)",
    bg: "rgba(255, 196, 74, 0.10)",
  },
  USDT0: {
    solid: "rgba(255, 152, 72, 0.94)",
    glow: "rgba(255, 152, 72, 0.22)",
    border: "rgba(255, 152, 72, 0.34)",
    bg: "rgba(255, 152, 72, 0.10)",
  },
  WFLR: {
    solid: "rgba(255, 92, 132, 0.94)",
    glow: "rgba(255, 92, 132, 0.22)",
    border: "rgba(255, 92, 132, 0.34)",
    bg: "rgba(255, 92, 132, 0.10)",
  },
  FXRP: {
    solid:
      "linear-gradient(90deg, rgba(255, 152, 72, 0.96), rgba(255, 92, 132, 0.96))",
    glow: "rgba(255, 126, 104, 0.20)",
    border: "rgba(255, 126, 104, 0.34)",
    bg: "rgba(255, 126, 104, 0.10)",
  },
  FBTC: {
    solid: "rgba(255, 184, 51, 0.94)",
    glow: "rgba(255, 184, 51, 0.22)",
    border: "rgba(255, 184, 51, 0.34)",
    bg: "rgba(255, 184, 51, 0.10)",
  },
  FLTC: {
    solid: "rgba(173, 216, 255, 0.94)",
    glow: "rgba(173, 216, 255, 0.22)",
    border: "rgba(173, 216, 255, 0.34)",
    bg: "rgba(173, 216, 255, 0.10)",
  },
  FDOGE: {
    solid: "rgba(240, 210, 120, 0.94)",
    glow: "rgba(240, 210, 120, 0.22)",
    border: "rgba(240, 210, 120, 0.34)",
    bg: "rgba(240, 210, 120, 0.10)",
  },
};

function badgeStyle(kind) {
  if (kind === "READY") {
    return {
      ...ui.badge,
      background: PALETTE.EON.bg,
      border: `1px solid ${PALETTE.EON.border}`,
      boxShadow: `0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 16px ${PALETTE.EON.glow}`,
    };
  }
  if (kind === "EXPIRED") {
    return {
      ...ui.badge,
      background: "rgba(255,70,70,0.10)",
      border: "1px solid rgba(255,70,70,0.24)",
      boxShadow:
        "0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 16px rgba(255,70,70,0.16)",
    };
  }
  return {
    ...ui.badge,
    background: PALETTE.WFLR.bg,
    border: `1px solid ${PALETTE.WFLR.border}`,
    boxShadow: `0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 16px ${PALETTE.WFLR.glow}`,
  };
}

function formatUsd(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function readLocalLookback() {
  try {
    const raw = window.localStorage.getItem("emp_claim_lookback_blocks");
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 200000;
    return Math.min(Math.floor(n), 5_000_000);
  } catch {
    return 200000;
  }
}

function abiHasFn(abi, name) {
  try {
    const a = Array.isArray(abi) ? abi : abi?.abi;
    if (!Array.isArray(a)) return false;
    return a.some((it) => it && it.type === "function" && it.name === name);
  } catch {
    return false;
  }
}

function fmtBps(bps) {
  const x = BigInt(bps ?? 0n);
  const whole = x / 100n;
  const frac = x % 100n;
  return `${whole.toString()}.${frac.toString().padStart(2, "0")}%`;
}

export default function EmpDashboard() {
  const vRaw = useEVaultState();
  const publicClient = usePublicClient();

  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState("");
  const [lastTx, setLastTx] = useState("");
  const txInFlightRef = useRef(false);

  const [viewportWidth, setViewportWidth] = useState(1280);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => setViewportWidth(window.innerWidth || 1280);
    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = viewportWidth <= 768;
  const isTablet = viewportWidth > 768 && viewportWidth <= 1024;

  const eonDecimals = Number(vRaw.eonDecimals ?? 18);
  const usdt0Decimals = Number(vRaw.usdt0Decimals ?? 6);
  const wflrDecimals = Number(vRaw.wflrDecimals ?? 18);

  const fxrpAddress = vRaw.fxrpAddress;
  const fxrpDecimals = Number(vRaw.fxrpDecimals ?? 18);

  const rawVaultEonBal =
    (typeof vRaw.rawVaultEonBal === "bigint" ? vRaw.rawVaultEonBal : null) ??
    (typeof vRaw.vaultEonBal === "bigint" ? vRaw.vaultEonBal : 0n);

  const rawVaultUsdt0Bal =
    (typeof vRaw.rawVaultUsdt0Bal === "bigint"
      ? vRaw.rawVaultUsdt0Bal
      : null) ??
    (typeof vRaw.vaultUsdt0Bal === "bigint" ? vRaw.vaultUsdt0Bal : 0n);

  const rawVaultWflrBal =
    (typeof vRaw.rawVaultWflrBal === "bigint" ? vRaw.rawVaultWflrBal : null) ??
    (typeof vRaw.vaultWflrBal === "bigint" ? vRaw.vaultWflrBal : 0n);

  const rawVaultFxrpBal =
    (typeof vRaw.rawVaultFxrpBal === "bigint" ? vRaw.rawVaultFxrpBal : null) ??
    (typeof vRaw.vaultFxrpBal === "bigint" ? vRaw.vaultFxrpBal : 0n);

  const activeVaultEonBal =
    (typeof vRaw.activeVaultEonBal === "bigint"
      ? vRaw.activeVaultEonBal
      : null) ?? rawVaultEonBal;

  const activeVaultUsdt0Bal =
    (typeof vRaw.activeVaultUsdt0Bal === "bigint"
      ? vRaw.activeVaultUsdt0Bal
      : null) ?? rawVaultUsdt0Bal;

  const activeVaultWflrBal =
    (typeof vRaw.activeVaultWflrBal === "bigint"
      ? vRaw.activeVaultWflrBal
      : null) ?? rawVaultWflrBal;

  const activeVaultFxrpBal =
    (typeof vRaw.activeVaultFxrpBal === "bigint"
      ? vRaw.activeVaultFxrpBal
      : null) ?? rawVaultFxrpBal;

  const reservedEon =
    typeof vRaw.reservedEon === "bigint" ? vRaw.reservedEon : 0n;

  const reservedUsdt0 =
    typeof vRaw.reservedUsdt0 === "bigint" ? vRaw.reservedUsdt0 : 0n;

  const totalFeesCollectedEon =
    typeof vRaw.totalFeesCollectedEon === "bigint"
      ? vRaw.totalFeesCollectedEon
      : 0n;

  const totalFeesCollectedUsdt0 =
    typeof vRaw.totalFeesCollectedUsdt0 === "bigint"
      ? vRaw.totalFeesCollectedUsdt0
      : 0n;

  const eonFree =
    (typeof vRaw.eonFree === "bigint" ? vRaw.eonFree : null) ??
    subClamp0(activeVaultEonBal, reservedEon);

  const usdt0Free =
    (typeof vRaw.usdt0Free === "bigint" ? vRaw.usdt0Free : null) ??
    subClamp0(activeVaultUsdt0Bal, reservedUsdt0);

  const cubeBalance = toBigIntSafe(
    vRaw.cubeBalance ?? vRaw.guardianStatus?.[0] ?? 0n,
  );
  const isCoherent = Boolean(
    vRaw.isCoherent ?? vRaw.guardianStatus?.[1] ?? false,
  );
  const contributionAllowed = Boolean(
    vRaw.contributionAllowed ?? vRaw.guardianStatus?.[2] ?? true,
  );
  const guardianActionsAllowed = Boolean(
    vRaw.guardianActionsAllowed ?? vRaw.guardianStatus?.[3] ?? isCoherent,
  );
  const guardianOpenClaims = toBigIntSafe(
    vRaw.userOpenClaims ?? vRaw.guardianStatus?.[4] ?? 0n,
  );
  const guardianCooldownRemaining = toBigIntSafe(
    vRaw.commitCooldownRemaining ?? vRaw.guardianStatus?.[5] ?? 0n,
  );

  const canCommitAllowed = Boolean(vRaw.canCommit?.[0] ?? false);
  const canCommitReason = String(vRaw.canCommit?.[1] ?? "UNKNOWN");

  const guardianUnlockStatus = Array.isArray(vRaw.guardianUnlockStatus)
    ? vRaw.guardianUnlockStatus
    : null;

  const coherentGuardianCount = toBigIntSafe(
    guardianUnlockStatus?.[0] ?? vRaw.coherentGuardianCount ?? 0n,
  );

  const guardianUnlockThreshold = toBigIntSafe(
    guardianUnlockStatus?.[1] ?? vRaw.guardianUnlockThreshold ?? 250000n,
  );

  const guardiansRemainingToUnlock = toBigIntSafe(
    guardianUnlockStatus?.[2] ??
      (guardianUnlockThreshold > coherentGuardianCount
        ? guardianUnlockThreshold - coherentGuardianCount
        : 0n),
  );

  const guardianThresholdMet = Boolean(
    guardianUnlockStatus?.[3] ??
    vRaw.guardianThresholdMet ??
    coherentGuardianCount >= guardianUnlockThreshold,
  );

  const operationallyLocked = Boolean(vRaw.operationallyLocked ?? true);
  const operationalLockReason =
    String(vRaw.operationalLockReason || "").trim() ||
    (operationallyLocked ? "vault reserves below minimum" : "");

  const operationalReady = !operationallyLocked;
  const operationalMsg = operationallyLocked ? operationalLockReason : "";

  const healthLabel = vRaw.healthLabel ?? "—";
  const healthTone = vRaw.healthTone ?? "neutral";

  const v = useMemo(() => {
    const withdrawAuthorizationItems = Array.isArray(
      vRaw.withdrawAuthorizationItems,
    )
      ? vRaw.withdrawAuthorizationItems
      : Array.isArray(vRaw.withdrawAuthorizations)
        ? vRaw.withdrawAuthorizations
        : [];

    return {
      ...vRaw,

      rawVaultEonBal,
      rawVaultUsdt0Bal,
      rawVaultWflrBal,
      rawVaultFxrpBal,

      activeVaultEonBal,
      activeVaultUsdt0Bal,
      activeVaultWflrBal,
      activeVaultFxrpBal,

      vaultEonBal: activeVaultEonBal,
      vaultUsdt0Bal: activeVaultUsdt0Bal,
      vaultWflrBal: activeVaultWflrBal,
      vaultFxrpBal: activeVaultFxrpBal,

      reservedEon,
      reservedUsdt0,
      eonFree,
      usdt0Free,

      totalFeesCollectedEon,
      totalFeesCollectedUsdt0,

      cubeBalance,
      isCoherent,
      contributionAllowed,
      guardianActionsAllowed,
      userOpenClaims: guardianOpenClaims,
      commitCooldownRemaining: guardianCooldownRemaining,
      guardianStatus: [
        cubeBalance,
        isCoherent,
        contributionAllowed,
        guardianActionsAllowed,
        guardianOpenClaims,
        guardianCooldownRemaining,
      ],
      canCommit: [canCommitAllowed, canCommitReason],

      coherentGuardianCount,
      guardianUnlockThreshold,
      guardiansRemainingToUnlock,
      guardianThresholdMet,
      guardianUnlockStatus: [
        coherentGuardianCount,
        guardianUnlockThreshold,
        guardiansRemainingToUnlock,
        guardianThresholdMet,
      ],

      operationallyLocked,
      operationalLockReason,
      healthLabel,
      healthTone,

      withdrawAuthorizationItems,
    };
  }, [
    vRaw,
    rawVaultEonBal,
    rawVaultUsdt0Bal,
    rawVaultWflrBal,
    rawVaultFxrpBal,
    activeVaultEonBal,
    activeVaultUsdt0Bal,
    activeVaultWflrBal,
    activeVaultFxrpBal,
    reservedEon,
    reservedUsdt0,
    eonFree,
    usdt0Free,
    totalFeesCollectedEon,
    totalFeesCollectedUsdt0,
    cubeBalance,
    isCoherent,
    contributionAllowed,
    guardianActionsAllowed,
    guardianOpenClaims,
    guardianCooldownRemaining,
    canCommitAllowed,
    canCommitReason,
    coherentGuardianCount,
    guardianUnlockThreshold,
    guardiansRemainingToUnlock,
    guardianThresholdMet,
    operationallyLocked,
    operationalLockReason,
    healthLabel,
    healthTone,
  ]);

  const {
    claimLookbackBlocks,
    setClaimLookbackBlocks,
    claimsOpen,
    setClaimsOpen,
    claimsBusy,
    claimsNote,
    pendingClaims,
    lastClaimsSync,
    pastClaimsOpen,
    setPastClaimsOpen,
    pastClaimsBusy,
    pastClaimsNote,
    pastClaims,
    lastPastClaimsSync,
    syncClaimsForWallet,
    syncPastClaimsForWallet,
  } = useEmpClaims({
    publicClient,
    vaultAddress: v.vaultAddress,
    isConnected,
    address,
    EVaultAbi,
    extractError,
  });

  const canWrite =
    v.enabled &&
    isConnected &&
    isAddr(v.vaultAddress) &&
    isAddr(v.eonAddress) &&
    isAddr(v.usdt0Address) &&
    isAddr(v.wflrAddress);

  const GAS_APPROVE = 120000n;
  const GAS_COMMIT = 520000n;
  const GAS_CLAIM = 380000n;
  const GAS_TRANSFER = 120000n;
  const GAS_WITHDRAW_EXECUTE = 220000n;

  const BPS_DENOM = 10000n;
  const SLIPPAGE_BPS = 1000n;

  const [deterministicOpen, setDeterministicOpen] = useState(false);

  const [contribOpen, setContribOpen] = useState(false);
  const [contribAsset, setContribAsset] = useState("USDT0");
  const [contribAmt, setContribAmt] = useState("");

  const [contribReadOpen, setContribReadOpen] = useState(false);
  const [contribReadAccepted, setContribReadAccepted] = useState(false);
  const [contribReadPulse, setContribReadPulse] = useState(false);
  const contribReadWrapRef = useRef(null);

  const [showUsdtAsUsd, setShowUsdtAsUsd] = useState(false);
  const [showEonAsUsd, setShowEonAsUsd] = useState(false);

  const [approveUsdt0, setApproveUsdt0] = useState("");
  const [approveEon, setApproveEon] = useState("");

  const [commitUsdtIn, setCommitUsdtIn] = useState("");
  const [commitEonIn, setCommitEonIn] = useState("");

  const [modeUsdt, setModeUsdt] = useState("APPROVE");
  const [modeEon, setModeEon] = useState("APPROVE");

  const [feeGlowEon, setFeeGlowEon] = useState(false);
  const [feeGlowUsdt0, setFeeGlowUsdt0] = useState(false);
  const prevFees = useRef({ eon: 0n, usdt0: 0n, _te: null, _tu: null });

  const [priceFlash, setPriceFlash] = useState("");
  const prevPriceRef = useRef(0n);
  const priceFlashTimerRef = useRef(null);

  const quoteSupported = v.quoteSupported;
  const hasQuoteFns =
    typeof v.quoteUsdt0ForEon === "function" &&
    typeof v.quoteEonForUsdt0 === "function";

  const quoteUsdtToEonReady =
    v.quoteUsdt0ToEon?.inAmount ===
      parseUnitsOrZero(commitUsdtIn, usdt0Decimals) &&
    typeof v.quoteUsdt0ToEon?.outNet === "bigint";

  const quoteEonToUsdtReady =
    v.quoteEonToUsdt0?.inAmount ===
      parseUnitsOrZero(commitEonIn, eonDecimals) &&
    typeof v.quoteEonToUsdt0?.outNet === "bigint";

  const futureAssets = useMemo(() => {
    return FUTURE_FASSET_CONFIG.map((item) => ({
      ...item,
      addressReady: isAddr(item.address),
      status: item.live && isAddr(item.address) ? "LIVE" : "PLACEHOLDER",
    }));
  }, []);

  const contributionOptions = useMemo(() => {
    const liveOptions = [
      { key: "USDT0", label: "USDT0 (deposit)", disabled: false },
      { key: "EON", label: "EON (deposit)", disabled: false },
      { key: "WFLR", label: "WFLR (deposit)", disabled: false },
      { key: "FXRP", label: "FXRP (deposit)", disabled: false },
    ];

    const futureOptions = futureAssets.map((a) => ({
      key: a.key,
      label: `${a.label} (coming soon)`,
      disabled: !(a.live && a.addressReady && a.contributionEnabled),
    }));

    return [...liveOptions, ...futureOptions];
  }, [futureAssets]);

  const { usdtPerEon_1e18, refreshEonPrice } = useEmpPricing({
    publicClient,
    v,
    EVaultAbi,
    abiHasFn,
    isAddr,
    subClamp0,
    eonDecimals,
    usdt0Decimals,
  });

  const {
    checkpointNowTs,
    checkpointPriceText,
    checkpointAgeSec,
    checkpointResetInSec,
    hasCheckpointFns,
  } = useEmpCheckpoint({
    publicClient,
    v,
    EVaultAbi,
    abiHasFn,
    isAddr,
    formatUnitsSafe,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setClaimLookbackBlocks(readLocalLookback());
  }, [setClaimLookbackBlocks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "emp_claim_lookback_blocks",
        String(claimLookbackBlocks),
      );
    } catch {}
  }, [claimLookbackBlocks]);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!contribReadOpen) return;
      const el = contribReadWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target)) setContribReadOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [contribReadOpen]);

  useEffect(() => {
    if (!contribOpen) {
      setContribReadOpen(false);
      setContribReadAccepted(false);
      setContribReadPulse(false);
    }
  }, [contribOpen]);

  useEffect(() => {
    const e = v.totalFeesCollectedEon ?? 0n;
    const u = v.totalFeesCollectedUsdt0 ?? 0n;

    if (e > prevFees.current.eon) {
      setFeeGlowEon(true);
      const t = setTimeout(() => setFeeGlowEon(false), 1200);
      if (prevFees.current._te) clearTimeout(prevFees.current._te);
      prevFees.current._te = t;
    }

    if (u > prevFees.current.usdt0) {
      setFeeGlowUsdt0(true);
      const t = setTimeout(() => setFeeGlowUsdt0(false), 1200);
      if (prevFees.current._tu) clearTimeout(prevFees.current._tu);
      prevFees.current._tu = t;
    }

    prevFees.current.eon = e;
    prevFees.current.usdt0 = u;

    return () => {
      if (prevFees.current._te) clearTimeout(prevFees.current._te);
      if (prevFees.current._tu) clearTimeout(prevFees.current._tu);
    };
  }, [v.totalFeesCollectedEon, v.totalFeesCollectedUsdt0]);

  useEffect(() => {
    const prev = prevPriceRef.current;
    const curr = usdtPerEon_1e18 ?? 0n;

    if (prev > 0n && curr > 0n) {
      if (curr > prev) {
        setPriceFlash("up");
        if (priceFlashTimerRef.current)
          clearTimeout(priceFlashTimerRef.current);
        priceFlashTimerRef.current = setTimeout(() => setPriceFlash(""), 900);
      } else if (curr < prev) {
        setPriceFlash("down");
        if (priceFlashTimerRef.current)
          clearTimeout(priceFlashTimerRef.current);
        priceFlashTimerRef.current = setTimeout(() => setPriceFlash(""), 900);
      }
    }

    prevPriceRef.current = curr;

    return () => {
      if (priceFlashTimerRef.current) clearTimeout(priceFlashTimerRef.current);
    };
  }, [usdtPerEon_1e18]);

  async function ensureConnected() {
    if (isConnected) return;
    await connectAsync({ connector: injected() });
  }

  async function sendTx(label, fn, opts = {}) {
    const { onConfirmed } = opts;

    if (txInFlightRef.current) {
      setStatus("Another transaction is already in progress. Please wait.");
      return null;
    }

    txInFlightRef.current = true;
    setStatus(`${label}…`);
    setLastTx("");

    try {
      await ensureConnected();

      const hash = await fn();
      setLastTx(hash);
      setStatus(`${label}: pending`);

      if (publicClient && hash) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt?.status === "reverted") {
          setStatus(`${label}: Transaction reverted`);
          return null;
        }

        setStatus(`${label}: confirmed`);
      } else {
        setStatus(`${label}: sent`);
      }

      if (typeof onConfirmed === "function") {
        await onConfirmed();
      }

      return hash;
    } catch (e) {
      const friendly = extractError(e);
      console.error("SENDTX RAW ERROR:", e);
      console.error("SENDTX FRIENDLY:", friendly);
      setStatus(`${label}: ${friendly}`);
      return null;
    } finally {
      txInFlightRef.current = false;
    }
  }

   const responsiveUi = useMemo(() => {
    return {
      ...ui,
      bg: {
        ...ui.bg,
        padding: isMobile ? "10px 10px 28px" : "12px 16px 40px",
      },
      page: {
        ...ui.page,
        maxWidth: isMobile ? 680 : isTablet ? 980 : 1240,
      },
      topStrip: {
        ...ui.topStrip,
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
      },
      statusLine: {
        ...ui.statusLine,
        padding: isMobile ? "10px 12px" : "10px 14px",
      },
      gridTop: {
        ...ui.gridTop,
        gridTemplateColumns: isMobile
          ? "1fr"
          : isTablet
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(3, minmax(0, 1fr))",
        gap: isMobile ? 10 : 12,
      },
      chip: {
        ...ui.chip,
        fontSize: isMobile ? 11 : 12,
        padding: isMobile ? "6px 8px" : "6px 10px",
      },
      btnPrimary: {
        ...ui.btnPrimary,
        width: isMobile ? "100%" : "auto",
      },
      btnGhost: {
        ...ui.btnGhost,
        width: isMobile ? "100%" : "auto",
      },
      btnWarn: {
        ...ui.btnWarn,
        width: isMobile ? "100%" : "auto",
      },
      flowGrid: {
        ...ui.flowGrid,
        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
      },
      flowCard: {
        ...ui.flowCard,
        padding: isMobile ? 12 : 14,
      },
      contribRow: {
        ...ui.contribRow,
        gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 0.9fr",
      },
      maxRow: {
        ...ui.maxRow,
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
      },
      claimMetaRow: {
        ...ui.claimMetaRow,
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
      },
    };
  }, [isMobile, isTablet]);

  const headerRight = useMemo(() => {
    if (!isConnected) {
      return (
        <button
          onClick={() => connectAsync({ connector: injected() })}
          style={{
            ...responsiveUi.btnPrimary,
            width: isMobile ? "100%" : "auto",
          }}
          type="button"
        >
          Connect
        </button>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexDirection: isMobile ? "column" : "row",
          width: isMobile ? "100%" : "auto",
        }}
      >
        <div
          style={{
            fontSize: 12,
            opacity: 0.85,
            width: isMobile ? "100%" : "auto",
            textAlign: isMobile ? "center" : "left",
          }}
        >
          {shortAddr(address)}
        </div>
        <button
          onClick={() => disconnect()}
          style={{
            ...responsiveUi.btnGhost,
            width: isMobile ? "100%" : "auto",
          }}
          type="button"
        >
          Disconnect
        </button>
      </div>
    );
  }, [isConnected, address, connectAsync, disconnect, isMobile, responsiveUi]);

  const walletNative = v.walletNativeBal ?? v.nativeBalance ?? 0n;
  const walletEon = v.walletEonBal ?? 0n;
  const walletUsdt0 = v.walletUsdt0Bal ?? 0n;
  const walletWflr = v.walletWflrBal ?? 0n;

  const desiredUsdtIn = parseUnitsOrZero(commitUsdtIn, usdt0Decimals);
  const desiredEonIn = parseUnitsOrZero(commitEonIn, eonDecimals);

  const usdtFlowReady =
    desiredUsdtIn > 0n && bnGte(v.usdt0Allowance, desiredUsdtIn);
  const eonFlowReady = desiredEonIn > 0n && bnGte(v.eonAllowance, desiredEonIn);

  const usdtPerEonNum = Number(formatUnitsSafe(usdtPerEon_1e18, 18, 6));
  const usdtPerEonText = formatUnitsSafe(usdtPerEon_1e18, 18, 6);

  const vaultHealthPercent = (() => {
    const vaultEon = v.activeVaultEonBal ?? v.vaultEonBal ?? 0n;
    const vaultUsdt0 = v.activeVaultUsdt0Bal ?? v.vaultUsdt0Bal ?? 0n;

    const totalReserved = reservedEon + reservedUsdt0;
    const totalVault = vaultEon + vaultUsdt0;

    if (totalReserved === 0n) return totalVault > 0n ? 100 : 0;

    const pct = Number((totalVault * 10000n) / totalReserved) / 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  })();

  const vaultHealthColor = operationallyLocked
    ? "#ff4d6d"
    : vaultHealthPercent >= 100
      ? "#00ffa3"
      : vaultHealthPercent >= 75
        ? "#ffd166"
        : "#ff9f43";

  const visibleUsdtBal = v.usdt0Free ?? 0n;
  const visibleEonBal = v.eonFree ?? 0n;

  const usdtDisplay = showUsdtAsUsd
    ? formatUsd(Number(formatUnitsSafe(visibleUsdtBal, usdt0Decimals, 6)))
    : formatUnitsSafe(visibleUsdtBal, usdt0Decimals);

  const eonRaw = Number(formatUnitsSafe(visibleEonBal, eonDecimals, 6));
  const eonDisplay = showEonAsUsd
    ? formatUsd(eonRaw * (Number.isFinite(usdtPerEonNum) ? usdtPerEonNum : 0))
    : formatUnitsSafe(visibleEonBal, eonDecimals);

  const isControllerConnected = useMemo(() => {
    if (!isAddr(address) || !isAddr(v.controller)) return false;
    return address.toLowerCase() === v.controller.toLowerCase();
  }, [address, v.controller]);

  const pendingWithdrawItems = useMemo(() => {
    const items = Array.isArray(v.withdrawAuthorizationItems)
      ? v.withdrawAuthorizationItems
      : [];

    return items
      .filter((a) => a && a.exists && !a.executed && !a.cancelled)
      .sort((a, b) => {
        const an = typeof a.notBefore === "bigint" ? a.notBefore : 0n;
        const bn = typeof b.notBefore === "bigint" ? b.notBefore : 0n;
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
  }, [v.withdrawAuthorizationItems]);

  const nextPendingWithdraw = useMemo(() => {
    return pendingWithdrawItems.length ? pendingWithdrawItems[0] : null;
  }, [pendingWithdrawItems]);

  const accessNowTs = useMemo(() => {
    if (typeof checkpointNowTs === "bigint" && checkpointNowTs > 0n) {
      return checkpointNowTs;
    }
    return 0n;
  }, [checkpointNowTs]);

  const nextWithdrawReadyIn = useMemo(() => {
    if (!nextPendingWithdraw) return 0n;

    const notBefore =
      typeof nextPendingWithdraw.notBefore === "bigint"
        ? nextPendingWithdraw.notBefore
        : 0n;

    if (accessNowTs === 0n || notBefore === 0n) return 0n;
    return notBefore > accessNowTs ? notBefore - accessNowTs : 0n;
  }, [nextPendingWithdraw, accessNowTs]);

  const nextWithdrawTokenLabel = useMemo(() => {
    if (!nextPendingWithdraw) return "—";
    const t = String(nextPendingWithdraw.token || "").toLowerCase();
    if (t === String(v.eonAddress || "").toLowerCase())
      return v.eonSymbol || "EON";
    if (t === String(v.usdt0Address || "").toLowerCase()) {
      return v.usdt0Symbol || "USDT0";
    }
    if (t === String(v.wflrAddress || "").toLowerCase())
      return v.wflrSymbol || "WFLR";
    if (t === String(v.fxrpAddress || "").toLowerCase())
      return v.fxrpSymbol || "FXRP";
    return "TOKEN";
  }, [
    nextPendingWithdraw,
    v.eonAddress,
    v.usdt0Address,
    v.wflrAddress,
    v.fxrpAddress,
    v.eonSymbol,
    v.usdt0Symbol,
    v.wflrSymbol,
    v.fxrpSymbol,
  ]);

  const nextWithdrawAmountText = useMemo(() => {
    if (!nextPendingWithdraw) return "—";

    const t = String(nextPendingWithdraw.token || "").toLowerCase();

    if (t === String(v.eonAddress || "").toLowerCase()) {
      return formatUnitsSafe(nextPendingWithdraw.amount ?? 0n, eonDecimals);
    }
    if (t === String(v.usdt0Address || "").toLowerCase()) {
      return formatUnitsSafe(nextPendingWithdraw.amount ?? 0n, usdt0Decimals);
    }
    if (t === String(v.wflrAddress || "").toLowerCase()) {
      return formatUnitsSafe(nextPendingWithdraw.amount ?? 0n, wflrDecimals);
    }
    if (t === String(v.fxrpAddress || "").toLowerCase()) {
      return formatUnitsSafe(nextPendingWithdraw.amount ?? 0n, fxrpDecimals);
    }

    return formatUnitsSafe(nextPendingWithdraw.amount ?? 0n, 18);
  }, [
    nextPendingWithdraw,
    v.eonAddress,
    v.usdt0Address,
    v.wflrAddress,
    v.fxrpAddress,
    eonDecimals,
    usdt0Decimals,
    wflrDecimals,
    fxrpDecimals,
  ]);

  const {
    projImpactBpsUsdtToEon,
    projImpactNoteUsdtToEon,
    projImpactBpsEonToUsdt,
    projImpactNoteEonToUsdt,
    impactTooHighEonToUsdt,
    impactNearLimitEonToUsdt,
    maxEonSafeStr,
    maxEonBusy,
    maxEonNote,
    showMaxBefore25,
  } = useEmpImpact({
    publicClient,
    address,
    v,
    EVaultAbi,
    commitUsdtIn,
    commitEonIn,
    usdt0Decimals,
    eonDecimals,
    parseUnitsOrZero,
    formatUnitsSafe,
    operationalReady,
    canWrite,
    modeEon,
    walletEon,
    checkpointNowTs,
    GAS_COMMIT,
  });

  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!quoteSupported || typeof v.quoteUsdt0ForEon !== "function") return;

      const amt = String(commitUsdtIn ?? "").trim();

      if (!amt) {
        if (!ignore) {
          v.quoteUsdt0ForEon(0n);
        }
        return;
      }

      if (!ignore) {
        v.quoteUsdt0ForEon(amt);
      }
    }

    run().catch(() => {});

    return () => {
      ignore = true;
    };
  }, [commitUsdtIn, quoteSupported, v.quoteUsdt0ForEon]);

  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!quoteSupported || typeof v.quoteEonForUsdt0 !== "function") return;

      const amt = String(commitEonIn ?? "").trim();

      if (!amt) {
        if (!ignore) {
          v.quoteEonForUsdt0(0n);
        }
        return;
      }

      if (!ignore) {
        v.quoteEonForUsdt0(amt);
      }
    }

    run().catch(() => {});

    return () => {
      ignore = true;
    };
  }, [commitEonIn, quoteSupported, v.quoteEonForUsdt0]);

  const {
    onApproveUsdt0,
    onCommitUsdtForEon,
    onApproveEon,
    onCommitEonForUsdt0,
  } = useEmpCommits({
    canWrite,
    operationalReady,
    operationalMsg,
    setStatus,
    sendTx,
    writeContractAsync,
    publicClient,
    address,
    v,
    EVaultAbi,
    erc20Abi,
    GAS_APPROVE,
    GAS_COMMIT,
    BPS_DENOM,
    SLIPPAGE_BPS,
    parseUnitsOrZero,
    formatUnitsSafe,
    refreshEonPrice,
    claimsOpen,
    pastClaimsOpen,
    syncClaimsForWallet,
    syncPastClaimsForWallet,
    usdt0Decimals,
    eonDecimals,
    setCommitUsdtIn,
    setModeUsdt,
    setCommitEonIn,
    setModeEon,
    setApproveUsdt0,
    setApproveEon,

    guardianCoherent:
      Boolean(v.isCoherent) && toBigIntSafe(v.cubeBalance) === 1n,
    guardianActionsAllowed: Boolean(v.guardianActionsAllowed),
    guardianThresholdMet,
  });

  const {
    onSyncGuardian,
    onExecuteWithdrawAuthorization,
    onContribute,
    guardianEntryAuthorized,
    guardianAlreadySynced,
    guardianEntryButtonText,
    syncFeeWflr,
  } = useEmpActions({
    canWrite,
    setStatus,
    operationalReady,
    operationalMsg,
    parseUnitsOrZero,
    eonDecimals,
    approveEon,
    v: { ...v, connectedAddress: address },
    GAS_APPROVE,
    erc20Abi,
    sendTx,
    writeContractAsync,
    GAS_WITHDRAW_EXECUTE,
    EVaultAbi,

    refreshEonPrice,
    refreshVaultState: v.refreshVaultState,

    guardianThresholdMet,
    guardianCount: coherentGuardianCount,
    guardianThreshold: guardianUnlockThreshold,

    contribReadAccepted,
    setContribReadOpen,
    setContribReadPulse,
    contribAsset,
    contribAmt,
    setContribAmt,
    usdt0Decimals,
    wflrDecimals,
    fxrpAddress,
    fxrpDecimals,
    isAddr,
    GAS_TRANSFER,
  });

  const {
    accessOpen,
    setAccessOpen,
    contributionAllowed: accessContributionAllowed,
    guardianActionsAllowed: accessGuardianActionsAllowed,
    guardianStateLabel,
    guardianStateMessage,
    userOpenClaims,
    commitCooldownRemaining,
    commitAllowed,
    commitReason,
    accessLocked,
    accessLockReason,
  } = useEmpAccessState({
    isControllerConnected,
    nextPendingWithdraw,
    nextWithdrawReadyIn,
    onExecuteWithdrawAuthorization,

    connectedAddress: address,
    guardianStatus: v.guardianStatus,
    canCommit: v.canCommit,
    operationallyLocked: v.operationallyLocked,
    operationalLockReason: v.operationalLockReason,
  });

  const { onClaimById, onExpireById } = useEmpClaimActions({
    canWrite,
    setStatus,
    sendTx,
    writeContractAsync,
    v,
    EVaultAbi,
    GAS_CLAIM,
    refreshEonPrice,
    claimsOpen,
    pastClaimsOpen,
    syncClaimsForWallet,
    syncPastClaimsForWallet,
  });

  function dirLabel(direction) {
    if (direction === 0 || direction === 0n) return "USDT0 → EON";
    if (direction === 1 || direction === 1n) return "EON → USDT0";
    return String(direction ?? "—");
  }

  useEffect(() => {
    if (!String(approveUsdt0 || "").trim() && modeUsdt === "COMMIT") {
      setModeUsdt("APPROVE");
    }
  }, [approveUsdt0, modeUsdt]);

  useEffect(() => {
    if (!String(approveEon || "").trim() && modeEon === "COMMIT") {
      setModeEon("APPROVE");
    }
  }, [approveEon, modeEon]);

  useEffect(() => {
    if (!contribReadPulse) return;
    const t = setTimeout(() => setContribReadPulse(false), 1600);
    return () => clearTimeout(t);
  }, [contribReadPulse]);

  const priceCenterStyle =
    priceFlash === "up"
      ? { ...ui.priceCenter, ...ui.priceFlashUp }
      : priceFlash === "down"
        ? { ...ui.priceCenter, ...ui.priceFlashDown }
        : ui.priceCenter;

  const depositLocked = !contribReadAccepted;

  return (
    <EmpLayout headerRight={headerRight} showHero>
      <style>{`
        @keyframes empPulseGlow {
          0%   { filter: brightness(1); transform: translateZ(0); }
          50%  { filter: brightness(1.18); }
          100% { filter: brightness(1); }
        }
        @keyframes empPriceUpFlash {
          0%   { color: rgba(255,255,255,0.96); text-shadow: none; }
          35%  { color: rgba(80,255,140,0.98); text-shadow: 0 0 14px rgba(80,255,140,0.55); }
          100% { color: rgba(255,255,255,0.96); text-shadow: none; }
        }
        @keyframes empPriceDownFlash {
          0%   { color: rgba(255,255,255,0.96); text-shadow: none; }
          35%  { color: rgba(255,96,96,0.98); text-shadow: 0 0 14px rgba(255,96,96,0.55); }
          100% { color: rgba(255,255,255,0.96); text-shadow: none; }
        }
        @keyframes empAcknowledgePulse {
          0% { box-shadow: 0 0 0 rgba(0,255,163,0); transform: scale(1); }
          50% { box-shadow: 0 0 18px rgba(0,255,163,0.30); transform: scale(1.02); }
          100% { box-shadow: 0 0 0 rgba(0,255,163,0); transform: scale(1); }
        }
        @keyframes empGlyphSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(180deg); }
        }
      `}</style>

      <div style={responsiveUi.bg}>
        <div style={responsiveUi.page}>
          <div style={responsiveUi.topStrip}>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                width: isMobile ? "100%" : "auto",
                justifyContent: isMobile ? "center" : "flex-start",
              }}
            >
              <span style={responsiveUi.chip}>
                {String(v.chain).toUpperCase()}
              </span>
              <span style={responsiveUi.chip}>
                VAULT: {shortAddr(v.vaultAddress)}
              </span>
              <span style={responsiveUi.chip}>
                EON: {shortAddr(v.eonAddress)}
              </span>
              <span style={responsiveUi.chip}>
                USDT0: {shortAddr(v.usdt0Address)}
              </span>
              <span style={responsiveUi.chip}>
                WFLR: {shortAddr(v.wflrAddress)}
              </span>
              {isAddr(fxrpAddress) ? (
                <span style={responsiveUi.chip}>
                  FXRP: {shortAddr(fxrpAddress)}
                </span>
              ) : null}
            </div>

            <button
              onClick={() => window.location.reload()}
              style={responsiveUi.btnWarn}
              type="button"
            >
              Refresh
            </button>
          </div>

          <div style={responsiveUi.statusLine}>
            <div
              style={{
                opacity: 0.92,
                fontSize: isMobile ? 12 : 14,
                wordBreak: "break-word",
              }}
            >
              {status}
              {lastTx ? (
                <span
                  style={{
                    marginLeft: isMobile ? 0 : 10,
                    marginTop: isMobile ? 6 : 0,
                    display: isMobile ? "block" : "inline",
                    opacity: 0.8,
                  }}
                >
                  tx: <code style={responsiveUi.code}>{shortAddr(lastTx)}</code>
                </span>
              ) : null}
            </div>
          </div>

          <div style={responsiveUi.gridTop}>
            <VaultStatePanel
              ui={responsiveUi}
              v={v}
              formatUnitsSafe={formatUnitsSafe}
            />

            <VaultBalancesPanel
              ui={responsiveUi}
              v={v}
              fxrpAddress={fxrpAddress}
              fxrpDecimals={fxrpDecimals}
              wflrDecimals={wflrDecimals}
              eonDecimals={eonDecimals}
              usdt0Decimals={usdt0Decimals}
              formatUnitsSafe={formatUnitsSafe}
              showEonAsUsd={showEonAsUsd}
              setShowEonAsUsd={setShowEonAsUsd}
              showUsdtAsUsd={showUsdtAsUsd}
              setShowUsdtAsUsd={setShowUsdtAsUsd}
              eonDisplay={eonDisplay}
              usdtDisplay={usdtDisplay}
              feeGlowEon={feeGlowEon}
              feeGlowUsdt0={feeGlowUsdt0}
              priceCenterStyle={priceCenterStyle}
              usdtPerEon_1e18={usdtPerEon_1e18}
              usdtPerEonText={usdtPerEonText}
              vaultHealthColor={vaultHealthColor}
              vaultHealthPercent={vaultHealthPercent}
              isAddr={isAddr}
            />

            <WalletBalancesPanel
              v={v}
              address={address}
              walletNative={walletNative}
              walletEon={walletEon}
              walletUsdt0={walletUsdt0}
              walletWflr={walletWflr}
              fxrpAddress={fxrpAddress}
              fxrpDecimals={fxrpDecimals}
              wflrDecimals={wflrDecimals}
              eonDecimals={eonDecimals}
              usdt0Decimals={usdt0Decimals}
              formatUnitsSafe={formatUnitsSafe}
              shortAddr={shortAddr}
              isAddr={isAddr}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <ActionsPanel
              ui={responsiveUi}
              operationalReady={operationalReady}
              operationalMsg={operationalMsg}
              modeUsdt={modeUsdt}
              modeEon={modeEon}
              approveUsdt0={approveUsdt0}
              setApproveUsdt0={setApproveUsdt0}
              approveEon={approveEon}
              setApproveEon={setApproveEon}
              commitUsdtIn={commitUsdtIn}
              setCommitUsdtIn={setCommitUsdtIn}
              commitEonIn={commitEonIn}
              setCommitEonIn={setCommitEonIn}
              usdt0Decimals={usdt0Decimals}
              eonDecimals={eonDecimals}
              maybeSyncApproveToCommit={maybeSyncApproveToCommit}
              setModeUsdt={setModeUsdt}
              setModeEon={setModeEon}
              canWrite={canWrite}
              onSyncGuardian={onSyncGuardian}
              onApproveUsdt0={onApproveUsdt0}
              onApproveEon={onApproveEon}
              onCommitUsdtForEon={onCommitUsdtForEon}
              onCommitEonForUsdt0={onCommitEonForUsdt0}
              quoteSupported={quoteSupported}
              hasQuoteFns={hasQuoteFns}
              v={v}
              quoteUsdtToEonReady={quoteUsdtToEonReady}
              quoteEonToUsdtReady={quoteEonToUsdtReady}
              formatUnitsSafe={formatUnitsSafe}
              projImpactBpsUsdtToEon={projImpactBpsUsdtToEon}
              projImpactNoteUsdtToEon={projImpactNoteUsdtToEon}
              projImpactBpsEonToUsdt={projImpactBpsEonToUsdt}
              projImpactNoteEonToUsdt={projImpactNoteEonToUsdt}
              fmtBps={fmtBps}
              impactTooHighEonToUsdt={impactTooHighEonToUsdt}
              impactNearLimitEonToUsdt={impactNearLimitEonToUsdt}
              showMaxBefore25={showMaxBefore25}
              maxEonSafeStr={maxEonSafeStr}
              maxEonBusy={maxEonBusy}
              maxEonNote={maxEonNote}
              usdtFlowReady={usdtFlowReady}
              eonFlowReady={eonFlowReady}
              accessLocked={accessLocked}
              accessLockReason={accessLockReason}
              guardianStateLabel={guardianStateLabel}
              guardianStateMessage={guardianStateMessage}
              commitAllowed={commitAllowed}
              commitReason={commitReason}
              guardianActionsAllowed={accessGuardianActionsAllowed}
              contributionAllowed={accessContributionAllowed}
              userOpenClaims={userOpenClaims}
              commitCooldownRemaining={commitCooldownRemaining}
              guardianThresholdMet={guardianThresholdMet}
              guardianCount={coherentGuardianCount}
              guardianThreshold={guardianUnlockThreshold}
              guardianEntryAuthorized={guardianEntryAuthorized}
              guardianEntryButtonText={guardianEntryButtonText}
              guardianAlreadySynced={guardianAlreadySynced}
              syncFeeWflr={syncFeeWflr}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <DeterministicPanel
              ui={responsiveUi}
              deterministicOpen={deterministicOpen}
              setDeterministicOpen={setDeterministicOpen}
              isConnected={isConnected}
              v={v}
              formatDurationVerbose={formatDurationVerbose}
              hasCheckpointFns={hasCheckpointFns}
              checkpointPriceText={checkpointPriceText}
              formatDurationShort={formatDurationShort}
              checkpointAgeSec={checkpointAgeSec}
              checkpointResetInSec={checkpointResetInSec}
            />

            <AccessStatePanel
              ui={responsiveUi}
              accessOpen={accessOpen}
              setAccessOpen={setAccessOpen}
              v={{ ...v, checkpointNowTs: accessNowTs }}
              isAddr={isAddr}
              shortAddr={shortAddr}
              formatUnixTs={formatUnixTs}
              pendingWithdrawItems={pendingWithdrawItems}
              allWithdrawItems={
                Array.isArray(v.withdrawAuthorizationItems)
                  ? v.withdrawAuthorizationItems
                  : []
              }
              nextPendingWithdraw={nextPendingWithdraw}
              nextWithdrawAmountText={nextWithdrawAmountText}
              nextWithdrawTokenLabel={nextWithdrawTokenLabel}
              nextWithdrawReadyIn={nextWithdrawReadyIn}
              formatDurationShort={formatDurationShort}
              onExecuteWithdrawAuthorization={onExecuteWithdrawAuthorization}
              badgeStyle={badgeStyle}
              formatUnitsSafe={formatUnitsSafe}
            />

            <PendingClaimsPanel
              ui={responsiveUi}
              claimsOpen={claimsOpen}
              setClaimsOpen={setClaimsOpen}
              claimsBusy={claimsBusy}
              syncClaimsForWallet={syncClaimsForWallet}
              lastClaimsSync={lastClaimsSync}
              claimsNote={claimsNote}
              pendingClaims={pendingClaims}
              badgeStyle={badgeStyle}
              dirLabel={dirLabel}
              formatUnitsSafe={formatUnitsSafe}
              usdt0Decimals={usdt0Decimals}
              eonDecimals={eonDecimals}
              formatDurationShort={formatDurationShort}
              formatUnixTs={formatUnixTs}
              onClaimById={onClaimById}
              onExpireClaimById={onExpireById}
            />

            <PastClaimsPanel
              ui={responsiveUi}
              pastClaimsOpen={pastClaimsOpen}
              setPastClaimsOpen={setPastClaimsOpen}
              pastClaimsBusy={pastClaimsBusy}
              syncPastClaimsForWallet={syncPastClaimsForWallet}
              claimLookbackBlocks={claimLookbackBlocks}
              setClaimLookbackBlocks={setClaimLookbackBlocks}
              lastPastClaimsSync={lastPastClaimsSync}
              pastClaimsNote={pastClaimsNote}
              pastClaims={pastClaims}
              badgeStyle={badgeStyle}
              dirLabel={dirLabel}
              formatUnitsSafe={formatUnitsSafe}
              usdt0Decimals={usdt0Decimals}
              eonDecimals={eonDecimals}
              formatUnixTs={formatUnixTs}
              onExpireById={onExpireById}
            />
          </div>

          <ProtocolDepositPanel
            ui={responsiveUi}
            contribOpen={contribOpen}
            setContribOpen={setContribOpen}
            contribReadWrapRef={contribReadWrapRef}
            contribReadOpen={contribReadOpen}
            setContribReadOpen={setContribReadOpen}
            contribReadAccepted={contribReadAccepted}
            contribReadPulse={contribReadPulse}
            setContribReadAccepted={setContribReadAccepted}
            setContribReadPulse={setContribReadPulse}
            setStatus={setStatus}
            contribAsset={contribAsset}
            setContribAsset={setContribAsset}
            contributionOptions={contributionOptions}
            contribAmt={contribAmt}
            setContribAmt={setContribAmt}
            depositLocked={depositLocked}
            onContribute={onContribute}
          />

          <div
            style={{
              marginTop: 18,
              opacity: 0.65,
              fontSize: isMobile ? 11 : 12,
              textAlign: isMobile ? "center" : "left",
            }}
          >
            EMP workspace · EVault · read + write (manual)
          </div>
        </div>
      </div>
    </EmpLayout>
  );
}

const GLASS = {
  backdropFilter: "blur(12px) saturate(140%)",
  WebkitBackdropFilter: "blur(12px) saturate(140%)",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 12px 34px rgba(0,0,0,0.35)",
  transform: "translateZ(0)",
};

const ui = {
  bg: {
    minHeight: "100vh",
    padding: "12px 16px 40px",
    background: "linear-gradient(180deg, #000000 0%, #000000 100%)",
  },

  page: { maxWidth: 1240, margin: "0 auto" },
  glass: GLASS,

  topStrip: {
    ...GLASS,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 16,
  },

  statusLine: {
    ...GLASS,
    marginTop: 12,
    padding: "10px 14px",
    borderRadius: 14,
  },

  gridTop: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },

  chip: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  btnPrimary: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #00ff88, #00cc6a)",
    color: "#00210f",
    cursor: "pointer",
    fontWeight: 900,
    letterSpacing: 0.2,
    boxShadow: "0 0 14px rgba(0,255,136,0.35)",
  },

  btnGhost: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "linear-gradient(135deg, #0099ff, #00ccff)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
    letterSpacing: 0.2,
    boxShadow: "0 0 10px rgba(0,150,255,0.25)",
  },

  btnWarn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #ffd54a, #ffb300)",
    color: "#2b1d00",
    cursor: "pointer",
    fontWeight: 900,
    boxShadow: "0 0 10px rgba(255,200,0,0.25)",
  },

  input: {
    width: "100%",
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
    marginTop: 6,
  },

  select: {
    width: "100%",
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(10,10,10,0.55)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
  },

  tapValue: {
    cursor: "pointer",
    userSelect: "none",
    fontWeight: 950,
    opacity: 0.98,
  },

  esGrowMiniWrap: {
    display: "grid",
    gap: 4,
    marginTop: 2,
  },

  esGrowMiniRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    alignItems: "center",
    padding: "0 0 2px",
  },

  esGrowMiniLabel: {
    fontSize: 12,
    lineHeight: 1.35,
    opacity: 0.72,
    fontWeight: 700,
  },

  esGrowMiniValue: {
    fontSize: 12,
    lineHeight: 1.35,
    opacity: 0.72,
    fontWeight: 700,
  },

  esGrowMiniLabelGlow: {
    fontSize: 12,
    lineHeight: 1.35,
    opacity: 0.88,
    fontWeight: 700,
    color: "rgba(120, 190, 255, 0.98)",
    textShadow: "0 0 12px rgba(80,160,255,0.55)",
    transition: "all 0.25s ease",
  },

  esGrowMiniValueGlow: {
    fontSize: 12,
    lineHeight: 1.35,
    opacity: 0.88,
    fontWeight: 700,
    color: "rgba(120, 190, 255, 0.98)",
    textShadow: "0 0 12px rgba(80,160,255,0.55)",
    transition: "all 0.25s ease",
  },

  priceCenter: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    minHeight: 34,
    fontSize: 18,
    lineHeight: 1.2,
    fontWeight: 900,
    opacity: 0.96,
    letterSpacing: 0.2,
    transition: "all 0.2s ease",
  },

  priceFlashUp: {
    animation: "empPriceUpFlash 0.9s ease",
  },

  priceFlashDown: {
    animation: "empPriceDownFlash 0.9s ease",
  },

  footnote: { opacity: 0.7, fontSize: 12, marginTop: 8, lineHeight: 1.5 },
  sep: { height: 1, background: "rgba(255,255,255,0.10)", margin: "10px 0" },
  code: { fontSize: 12 },

  redText: {
    color: "rgba(255, 96, 96, 0.98)",
    textShadow: "0 0 10px rgba(255, 70, 70, 0.18)",
    fontWeight: 950,
  },

  amberText: {
    color: "rgba(255, 198, 84, 0.98)",
    textShadow: "0 0 10px rgba(255, 196, 74, 0.16)",
    fontWeight: 950,
  },

  warnBox: {
    marginTop: 8,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255, 160, 60, 0.10)",
    border: "1px solid rgba(255, 160, 60, 0.22)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    lineHeight: 1.5,
    fontWeight: 900,
  },

  maxRow: {
    marginTop: 6,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },

  barLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },

  barLabel: {
    fontWeight: 900,
    opacity: 0.92,
    fontSize: 12,
    letterSpacing: 0.2,
  },

  barPct: { fontSize: 12, fontWeight: 950, opacity: 0.85 },

  barTrack: {
    position: "relative",
    height: 12,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.10)",
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 140ms linear",
  },

  flowGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },

  flowCard: {
    ...GLASS,
    padding: 14,
    borderRadius: 16,
  },

  flowTitle: { fontWeight: 950, letterSpacing: 0.2, opacity: 0.95 },

  opLock: {
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255, 80, 80, 0.10)",
    border: "1px solid rgba(255, 80, 80, 0.22)",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 950,
    letterSpacing: 0.3,
  },

  claimBox: {
    ...GLASS,
    borderRadius: 16,
    overflow: "hidden",
  },

  contribHead: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    textAlign: "left",
  },

  contribTitle: { fontWeight: 950, letterSpacing: 0.4 },
  contribSub: { marginTop: 2, fontSize: 12, opacity: 0.7 },
  contribChev: { fontSize: 18, opacity: 0.75, fontWeight: 900 },
  contribBody: { padding: 14 },

  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
  },

  claimRowCard: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.02)",
  },

  claimMeta: {
    marginTop: 10,
    display: "grid",
    gap: 6,
    opacity: 0.92,
    fontSize: 13,
  },

  claimMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
  },

  claimK: { opacity: 0.75 },
  claimV: { fontWeight: 900, opacity: 0.95 },

  contribWrap: {
    ...GLASS,
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
  },

  contribRow: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 0.9fr",
    gap: 10,
    alignItems: "center",
  },

  readRow: {
    position: "relative",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },

  readLink: {
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.90)",
    fontWeight: 900,
    cursor: "pointer",
    padding: 0,
    marginLeft: 4,
    textDecoration: "underline",
  },

  readLockPill: {
    marginLeft: 8,
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.3,
    background: "rgba(255, 90, 90, 0.12)",
    border: "1px solid rgba(255, 90, 90, 0.22)",
    color: "rgba(255, 170, 170, 0.95)",
  },

  readReadyPill: {
    marginLeft: 8,
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.3,
    background: "rgba(0,255,136,0.12)",
    border: "1px solid rgba(0,255,136,0.22)",
    color: "rgba(180,255,220,0.95)",
  },

  readPopover: {
    marginTop: 10,
    width: "100%",
    padding: 12,
    borderRadius: 14,
    background: "rgba(0,0,0,0.55)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
  },

  readPopoverPulse: {
    animation: "empAcknowledgePulse 1.2s ease-in-out 1",
  },

  readPopoverTitle: {
    fontSize: 13,
    lineHeight: 1.2,
    fontWeight: 900,
    marginBottom: 6,
    opacity: 0.96,
  },

  readPopoverText: {
    fontSize: 11,
    lineHeight: 1.35,
    letterSpacing: 0,
    opacity: 0.82,
  },

  readAcknowledgeBox: {
    marginTop: 12,
    display: "grid",
    gap: 10,
  },

  ackToggle: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "40px 1fr",
    gap: 12,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
  },

  ackToggleOff: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.88)",
  },

  ackToggleOn: {
    background: "rgba(0,255,163,0.10)",
    border: "1px solid rgba(0,255,163,0.26)",
    color: "rgba(230,255,246,0.96)",
    boxShadow: "0 0 20px rgba(0,255,163,0.12)",
  },

  ackGlyph: {
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    fontSize: 16,
    fontWeight: 900,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.04)",
    opacity: 0.88,
  },

  ackGlyphOn: {
    border: "1px solid rgba(0,255,163,0.28)",
    background: "rgba(0,255,163,0.12)",
    color: "rgba(180,255,220,0.98)",
    boxShadow: "0 0 14px rgba(0,255,163,0.18)",
    animation: "empGlyphSpin 0.25s ease",
  },

  ackText: {
    fontSize: 12,
    lineHeight: 1.45,
    fontWeight: 800,
    letterSpacing: 0.1,
  },

  readActions: {
    display: "flex",
    justifyContent: "flex-end",
  },
};
