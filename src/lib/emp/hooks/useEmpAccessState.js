import { useEffect, useMemo, useState } from "react";

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

function normalizeGuardianStatus(guardianStatus) {
  if (!guardianStatus) {
    return {
      cubeBalance: 0n,
      coherent: false,
      contributionAllowed: true,
      guardianActionsAllowed: false,
      userOpenClaims: 0n,
      commitCooldownRemaining: 0n,
    };
  }

  if (Array.isArray(guardianStatus)) {
    const coherent = Boolean(guardianStatus[1]);

    return {
      cubeBalance: toBigIntSafe(guardianStatus[0], 0n),
      coherent,
      contributionAllowed:
        guardianStatus[2] === undefined ? true : Boolean(guardianStatus[2]),
      guardianActionsAllowed:
        guardianStatus[3] === undefined ? false : Boolean(guardianStatus[3]),
      userOpenClaims: toBigIntSafe(guardianStatus[4], 0n),
      commitCooldownRemaining: toBigIntSafe(guardianStatus[5], 0n),
    };
  }

  const coherent = Boolean(guardianStatus.coherent);

  return {
    cubeBalance: toBigIntSafe(guardianStatus.cubeBalance, 0n),
    coherent,
    contributionAllowed:
      guardianStatus.contributionAllowed === undefined
        ? true
        : Boolean(guardianStatus.contributionAllowed),
    guardianActionsAllowed:
      guardianStatus.guardianActionsAllowed === undefined
        ? false
        : Boolean(guardianStatus.guardianActionsAllowed),
    userOpenClaims: toBigIntSafe(guardianStatus.userOpenClaims, 0n),
    commitCooldownRemaining: toBigIntSafe(
      guardianStatus.commitCooldownRemaining,
      0n,
    ),
  };
}

function normalizeCanCommit(canCommit) {
  if (!canCommit) return { allowed: false, reason: "UNKNOWN" };

  if (Array.isArray(canCommit)) {
    return {
      allowed: Boolean(canCommit[0]),
      reason: String(canCommit[1] || "UNKNOWN"),
    };
  }

  return {
    allowed: Boolean(canCommit.allowed),
    reason: String(canCommit.reason || "UNKNOWN"),
  };
}

function deriveGuardianStateLabel(cubeBalance) {
  const n = Number(cubeBalance ?? 0n);
  if (n === 1) return "COHERENT";
  if (n === 0) return "SILENT";
  return "FRACTURED";
}

function deriveGuardianStateMessage(stateLabel) {
  if (stateLabel === "COHERENT") {
    return "Wallet holds exactly 1 cube. Guardian coherence detected.";
  }
  if (stateLabel === "SILENT") {
    return "Wallet holds 0 cubes. Guardian access is locked.";
  }
  return "Wallet holds 2 or more cubes. Guardian access is locked.";
}

function deriveAccessLockReason({
  connectedAddress,
  coherent,
  stateLabel,
  commitCooldownRemaining,
  canCommitAllowed,
  canCommitReason,
  operationallyLocked,
  operationalLockReason,
}) {
  if (!connectedAddress) return "Connect wallet";

  if (!coherent) {
    if (stateLabel === "SILENT") {
      return "Guardian access locked: wallet holds 0 cubes";
    }
    if (stateLabel === "FRACTURED") {
      return "Guardian access locked: wallet holds 2+ cubes";
    }
    return "Guardian access locked";
  }

  if (operationallyLocked) {
    return operationalLockReason || "Operational lock active";
  }

  if (toBigIntSafe(commitCooldownRemaining, 0n) > 0n) {
    return "Commit cooldown active";
  }

  if (!canCommitAllowed && canCommitReason && canCommitReason !== "OK") {
    return String(canCommitReason);
  }

  return "";
}

export default function useEmpAccessState({

  connectedAddress,
  guardianStatus,
  canCommit,
  operationallyLocked = false,
  operationalLockReason = "",
}) {
  const [accessOpen, setAccessOpen] = useState(false);
  const normalizedGuardianStatus = useMemo(
    () => normalizeGuardianStatus(guardianStatus),
    [guardianStatus],
  );

  const normalizedCanCommit = useMemo(
    () => normalizeCanCommit(canCommit),
    [canCommit],
  );

  const cubeBalance = normalizedGuardianStatus.cubeBalance;

  const coherent =
    Boolean(normalizedGuardianStatus.coherent) && cubeBalance === 1n;

  const contributionAllowed = normalizedGuardianStatus.contributionAllowed;

  const guardianActionsAllowed =
    Boolean(normalizedGuardianStatus.guardianActionsAllowed) && coherent;

  const userOpenClaims = normalizedGuardianStatus.userOpenClaims;
  const commitCooldownRemaining =
    normalizedGuardianStatus.commitCooldownRemaining;

  const guardianStateLabel = useMemo(
    () => deriveGuardianStateLabel(cubeBalance),
    [cubeBalance],
  );

  const guardianStateMessage = useMemo(
    () => deriveGuardianStateMessage(guardianStateLabel),
    [guardianStateLabel],
  );

  const commitAllowed =
    Boolean(connectedAddress) &&
    coherent &&
    !operationallyLocked &&
    normalizedCanCommit.allowed &&
    commitCooldownRemaining <= 0n;

  const accessLocked = !guardianActionsAllowed || operationallyLocked;

  const accessLockReason = useMemo(
    () =>
      deriveAccessLockReason({
        connectedAddress,
        coherent,
        stateLabel: guardianStateLabel,
        commitCooldownRemaining,
        canCommitAllowed: normalizedCanCommit.allowed,
        canCommitReason: normalizedCanCommit.reason,
        operationallyLocked,
        operationalLockReason,
      }),
    [
      connectedAddress,
      coherent,
      guardianStateLabel,
      commitCooldownRemaining,
      normalizedCanCommit.allowed,
      normalizedCanCommit.reason,
      operationallyLocked,
      operationalLockReason,
    ],
  );

  return {
    accessOpen,
    setAccessOpen,

    cubeBalance,
    coherent,
    contributionAllowed,
    guardianActionsAllowed,
    guardianStateLabel,
    guardianStateMessage,
    userOpenClaims,
    commitCooldownRemaining,

    commitAllowed,
    commitReason: normalizedCanCommit.reason,
    accessLocked,
    accessLockReason,
    operationallyLocked,
    operationalLockReason,
  };
}
