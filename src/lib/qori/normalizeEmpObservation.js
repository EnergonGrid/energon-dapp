const READ_STATUS = Object.freeze({
  LIVE: "LIVE",
  STALE: "STALE",
  UNKNOWN: "UNKNOWN",
  NOT_CONNECTED: "NOT_CONNECTED",
  UNSUPPORTED: "UNSUPPORTED",
});

const CORE_STATES = new Set(["SILENT", "COHERENT", "FRACTURED", "UNKNOWN"]);
const TRUSTED_CURRENT = new Set([READ_STATUS.LIVE]);

function normalizeStatus(value, fallback = READ_STATUS.UNKNOWN) {
  const status = String(value || "").trim().toUpperCase();
  return Object.values(READ_STATUS).includes(status) ? status : fallback;
}

function normalizeWallet(value) {
  const wallet = String(value || "").trim().toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(wallet) ? wallet : "";
}

function toNullableBigInt(value) {
  if (value === null || value === undefined || value === "") return null;
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isFinite(value)) {
      return BigInt(Math.trunc(value));
    }
    if (typeof value === "string" && value.trim() !== "") {
      return BigInt(value.trim());
    }
  } catch {}
  return null;
}

function toNullableBool(value) {
  return typeof value === "boolean" ? value : null;
}

function normalizeCoreState(core = {}) {
  const raw = String(core.guardianState || "UNKNOWN").trim().toUpperCase();
  const mapped = raw === "NO KEY" ? "SILENT" : raw;
  return CORE_STATES.has(mapped) ? mapped : "UNKNOWN";
}

function coreKnown(core = {}) {
  if (normalizeStatus(core.readStatus, READ_STATUS.UNKNOWN) !== READ_STATUS.LIVE) {
    return false;
  }
  return normalizeCoreState(core) !== "UNKNOWN";
}

function empStateFromValues(balance, coherent) {
  if (balance === null || coherent === null) return "UNKNOWN";
  if (balance === 0n && coherent === false) return "SILENT";
  if (balance === 1n && coherent === true) return "COHERENT";
  if (balance >= 2n && coherent === false) return "FRACTURED";
  return "INCONSISTENT";
}

function sameWallet(a, b) {
  const left = normalizeWallet(a);
  const right = normalizeWallet(b);
  return !!left && !!right && left === right;
}

function resolveDomain({
  status,
  current,
  previous,
  walletSpecific = false,
  currentWallet = "",
  previousWallet = "",
}) {
  const normalized = normalizeStatus(status);

  if (normalized === READ_STATUS.LIVE) {
    return { status: READ_STATUS.LIVE, value: current };
  }

  if (normalized === READ_STATUS.UNSUPPORTED) {
    return { status: READ_STATUS.UNSUPPORTED, value: null };
  }

  if (normalized === READ_STATUS.NOT_CONNECTED) {
    return { status: READ_STATUS.NOT_CONNECTED, value: null };
  }

  const mayReusePrevious =
    previous != null &&
    (!walletSpecific || sameWallet(currentWallet, previousWallet));

  if (mayReusePrevious) {
    return { status: READ_STATUS.STALE, value: previous };
  }

  return { status: READ_STATUS.UNKNOWN, value: null };
}

function normalizeIdentity({ core, emp, readStatus, previous, walletAddress }) {
  const coreState = normalizeCoreState(core);
  const coreCubeBalance = toNullableBigInt(core.cubeBalance);

  const resolved = resolveDomain({
    status: readStatus.guardian,
    current: {
      cubeBalance: toNullableBigInt(emp.cubeBalance),
      coherent: toNullableBool(emp.isCoherent),
    },
    previous: previous?.identity
      ? {
          cubeBalance: previous.identity.empCubeBalance,
          coherent: previous.identity.empCoherent,
        }
      : null,
    walletSpecific: true,
    currentWallet: walletAddress,
    previousWallet: previous?.walletAddress,
  });

  const empCubeBalance = resolved.value?.cubeBalance ?? null;
  const empCoherent = resolved.value?.coherent ?? null;
  const empState = empStateFromValues(empCubeBalance, empCoherent);

  let consistency = "UNKNOWN";
  if (
    coreKnown(core) &&
    resolved.status === READ_STATUS.LIVE &&
    empState !== "UNKNOWN"
  ) {
    consistency = empState === coreState ? "MATCH" : "MISMATCH";
  }

  return {
    canonicalSource: "CORE",
    coreState,
    coreCubeBalance,
    empState,
    empCubeBalance,
    empCoherent,
    consistency,
    status: resolved.status,
  };
}

function normalizeRegistration({ emp, readStatus, previous, walletAddress }) {
  const current = {
    synchronized: toNullableBool(emp.guardianAlreadySynced ?? emp.isSyncedGuardian),
    registeredCubeId: toNullableBigInt(emp.registeredGuardianCubeId),
    syncedAt: toNullableBigInt(emp.guardianSyncedAt),
    activeAt: toNullableBigInt(emp.guardianActiveAt),
    activationRemaining: toNullableBigInt(emp.guardianActivationRemaining),
    activationActive: toNullableBool(emp.guardianActivationActive),
  };

  const resolved = resolveDomain({
    status: readStatus.registration,
    current,
    previous: previous?.registration || null,
    walletSpecific: true,
    currentWallet: walletAddress,
    previousWallet: previous?.walletAddress,
  });

  return resolved.value
    ? { ...resolved.value, status: resolved.status }
    : {
        synchronized: null,
        registeredCubeId: null,
        syncedAt: null,
        activeAt: null,
        activationRemaining: null,
        activationActive: null,
        status: resolved.status,
      };
}

function normalizeAccess({ emp, readStatus, previous, walletAddress }) {
  const guardianStatus = Array.isArray(emp.guardianStatus) ? emp.guardianStatus : [];
  const canCommit = Array.isArray(emp.canCommit) ? emp.canCommit : [];

  const current = {
    contributionAllowed: toNullableBool(
      emp.contributionAllowed ?? guardianStatus[2],
    ),
    guardianActionsAllowed: toNullableBool(
      emp.guardianActionsAllowed ?? guardianStatus[3],
    ),
    canCommit: toNullableBool(emp.canCommitAllowed ?? canCommit[0]),
    commitReason:
      emp.canCommitReason != null
        ? String(emp.canCommitReason)
        : canCommit[1] != null
          ? String(canCommit[1])
          : null,
    cooldownRemaining: toNullableBigInt(
      emp.commitCooldownRemaining ?? guardianStatus[5],
    ),
    openClaims: toNullableBigInt(emp.userOpenClaims ?? guardianStatus[4]),
  };

  const resolved = resolveDomain({
    status: readStatus.access,
    current,
    previous: previous?.access || null,
    walletSpecific: true,
    currentWallet: walletAddress,
    previousWallet: previous?.walletAddress,
  });

  return resolved.value
    ? { ...resolved.value, status: resolved.status }
    : {
        contributionAllowed: null,
        guardianActionsAllowed: null,
        canCommit: null,
        commitReason: null,
        cooldownRemaining: null,
        openClaims: null,
        status: resolved.status,
      };
}

function normalizeThreshold({ emp, readStatus, previous }) {
  const current = {
    count: toNullableBigInt(emp.coherentGuardianCount),
    required: toNullableBigInt(emp.guardianUnlockThreshold),
    remaining: toNullableBigInt(emp.guardiansRemainingToUnlock),
    met: toNullableBool(emp.guardianThresholdMet),
  };

  const resolved = resolveDomain({
    status: readStatus.threshold,
    current,
    previous: previous?.threshold || null,
  });

  return resolved.value
    ? { ...resolved.value, status: resolved.status }
    : {
        count: null,
        required: null,
        remaining: null,
        met: null,
        status: resolved.status,
      };
}

function normalizeReserves({ emp, readStatus, previous }) {
  const current = {
    eon: {
      active: toNullableBigInt(emp.activeVaultEonBal),
      reserved: toNullableBigInt(emp.reservedEon),
      free: toNullableBigInt(emp.eonFree),
      minimum: toNullableBigInt(emp.minEonReserve),
      required: toNullableBigInt(emp.requiredEonReserve),
      minimumMet: toNullableBool(emp.eonMinMet),
    },
    usdt0: {
      active: toNullableBigInt(emp.activeVaultUsdt0Bal),
      reserved: toNullableBigInt(emp.reservedUsdt0),
      free: toNullableBigInt(emp.usdt0Free),
      minimum: toNullableBigInt(emp.minUsdt0Reserve),
      required: toNullableBigInt(emp.requiredUsdt0Reserve),
      minimumMet: toNullableBool(emp.usdt0MinMet),
    },
    wflr: {
      active: toNullableBigInt(emp.activeVaultWflrBal),
      minimum: toNullableBigInt(emp.minWflrReserve),
      minimumMet: toNullableBool(emp.wflrMinMet),
    },
    fxrp: {
      active: toNullableBigInt(emp.activeVaultFxrpBal),
      minimum: toNullableBigInt(emp.minFxrpReserve),
      minimumMet: toNullableBool(emp.fxrpMinMet),
    },
    minimumsMet: toNullableBool(emp.minimumsMet),
    operationallyLocked: toNullableBool(emp.operationallyLocked),
    lockReason:
      emp.operationalLockReason == null
        ? null
        : String(emp.operationalLockReason),
    healthLabel: emp.healthLabel == null ? null : String(emp.healthLabel),
  };

  const resolved = resolveDomain({
    status: readStatus.reserves,
    current,
    previous: previous?.reserves || null,
  });

  return resolved.value
    ? { ...resolved.value, status: resolved.status }
    : {
        eon: null,
        usdt0: null,
        wflr: null,
        fxrp: null,
        minimumsMet: null,
        operationallyLocked: null,
        lockReason: null,
        healthLabel: null,
        status: resolved.status,
      };
}

function normalizeMaturity({ emp, readStatus, previous }) {
  const current = {
    free24hSeconds: toNullableBigInt(emp.maturityFree24h),
    fast12hSeconds: toNullableBigInt(emp.maturityFast12h),
    rapid6hSeconds: toNullableBigInt(emp.maturityRapid6h),
    freeFeeBps: toNullableBigInt(emp.maturityFreeFeeBps),
    fastFeeBps: toNullableBigInt(emp.maturityFastFeeBps),
    rapidFeeBps: toNullableBigInt(emp.maturityRapidFeeBps),
  };

  const resolved = resolveDomain({
    status: readStatus.maturity,
    current,
    previous: previous?.maturity || null,
  });

  return resolved.value
    ? { ...resolved.value, status: resolved.status }
    : {
        free24hSeconds: null,
        fast12hSeconds: null,
        rapid6hSeconds: null,
        freeFeeBps: null,
        fastFeeBps: null,
        rapidFeeBps: null,
        status: resolved.status,
      };
}

export function normalizeEmpObservation({
  core = {},
  emp = {},
  previous = null,
  walletAddress = core.walletAddress || "",
} = {}) {
  const normalizedWallet = normalizeWallet(walletAddress);
  const connected = Boolean(core.walletConnected && normalizedWallet);

  const readStatus = {
    guardian: normalizeStatus(
      emp.readStatus?.guardian,
      connected ? READ_STATUS.UNKNOWN : READ_STATUS.NOT_CONNECTED,
    ),
    registration: normalizeStatus(
      emp.readStatus?.registration,
      connected ? READ_STATUS.UNKNOWN : READ_STATUS.NOT_CONNECTED,
    ),
    access: normalizeStatus(
      emp.readStatus?.access,
      connected ? READ_STATUS.UNKNOWN : READ_STATUS.NOT_CONNECTED,
    ),
    threshold: normalizeStatus(emp.readStatus?.threshold),
    reserves: normalizeStatus(emp.readStatus?.reserves),
    maturity: normalizeStatus(emp.readStatus?.maturity),
  };

  return {
    walletAddress: normalizedWallet,
    connected,
    identity: normalizeIdentity({
      core,
      emp,
      readStatus,
      previous,
      walletAddress: normalizedWallet,
    }),
    registration: normalizeRegistration({
      emp,
      readStatus,
      previous,
      walletAddress: normalizedWallet,
    }),
    access: normalizeAccess({
      emp,
      readStatus,
      previous,
      walletAddress: normalizedWallet,
    }),
    threshold: normalizeThreshold({ emp, readStatus, previous }),
    reserves: normalizeReserves({ emp, readStatus, previous }),
    maturity: normalizeMaturity({ emp, readStatus, previous }),
  };
}

export { READ_STATUS };
