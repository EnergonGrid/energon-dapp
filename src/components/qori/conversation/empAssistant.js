function normalizeInput(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(text = "", phrase = "") {
  const source = normalizeInput(text);
  const target = normalizeInput(phrase);
  if (!source || !target) return false;

  const pattern = new RegExp(
    `(?:^|[^a-z0-9])${escapeRegExp(target)}(?:$|[^a-z0-9])`,
    "i",
  );

  return pattern.test(source);
}

function hasAny(text = "", phrases = []) {
  return phrases.some((phrase) => hasPhrase(text, phrase));
}

function statusOf(value) {
  const status = String(value || "UNKNOWN").trim().toUpperCase();

  return ["LIVE", "STALE", "UNKNOWN", "NOT_CONNECTED", "UNSUPPORTED"].includes(
    status,
  )
    ? status
    : "UNKNOWN";
}

function isReadableStatus(status) {
  return status === "LIVE" || status === "STALE";
}

function freshnessLabel(status) {
  return status === "STALE" ? "LAST KNOWN" : "LIVE";
}

function formatBigInt(value) {
  if (value === null || value === undefined) return "UNKNOWN";

  try {
    const bigint = typeof value === "bigint" ? value : BigInt(value);
    return bigint.toLocaleString("en-US");
  } catch {
    return "UNKNOWN";
  }
}

function formatDuration(secondsLike) {
  if (secondsLike === null || secondsLike === undefined) return "UNKNOWN";

  let total;

  try {
    total = Number(
      typeof secondsLike === "bigint" ? secondsLike : BigInt(secondsLike),
    );
  } catch {
    return "UNKNOWN";
  }

  if (!Number.isFinite(total) || total < 0) return "UNKNOWN";
  if (total === 0) return "0s";

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatBps(value) {
  if (value === null || value === undefined) return null;

  try {
    const bps = typeof value === "bigint" ? value : BigInt(value);
    const whole = bps / 100n;
    const fraction = bps % 100n;

    return `${whole.toString()}.${fraction.toString().padStart(2, "0")}%`;
  } catch {
    return null;
  }
}

function unavailableObservation(label, status) {
  if (status === "NOT_CONNECTED") {
    return `${label}

Wallet-specific EMP state requires a connected wallet.

Core Guardian identity remains separate and canonical.

_`;
  }

  if (status === "UNSUPPORTED") {
    return `${label}

This EMP state is not exposed by the current read interface.

Q.O.R.I will not infer a replacement value.

_`;
  }

  return `${label}

Current EMP state could not be verified.

No read is not treated as zero, false, unlocked, or unregistered.

_`;
}

function buildRegistrationObservation(observation = {}) {
  const registration = observation.registration || {};
  const status = statusOf(registration.status);

  if (!isReadableStatus(status)) {
    return unavailableObservation("EMP GUARDIAN REGISTRATION", status);
  }

  const synchronized =
    registration.synchronized === true
      ? "SYNCHRONIZED"
      : registration.synchronized === false
        ? "NOT SYNCHRONIZED"
        : "UNKNOWN";

  const cubeId =
    registration.registeredCubeId === null ||
    registration.registeredCubeId === undefined
      ? "UNKNOWN"
      : registration.registeredCubeId === 0n
        ? "NONE"
        : formatBigInt(registration.registeredCubeId);

  let activation = "UNKNOWN";

  if (registration.activationActive === true) {
    activation = "ACTIVE";
  } else if (
    registration.activationRemaining !== null &&
    registration.activationRemaining !== undefined &&
    registration.activationRemaining > 0n
  ) {
    activation =
      `${formatDuration(registration.activationRemaining)} REMAINING`;
  } else if (registration.synchronized === false) {
    activation = "NOT STARTED";
  } else if (registration.activationActive === false) {
    activation = "NOT CONFIRMED";
  }

  return `EMP GUARDIAN REGISTRATION · ${freshnessLabel(status)}

Synchronization:
${synchronized}

Registered Cube:
${cubeId}

Activation:
${activation}

EMP synchronization does not redefine Core Guardian identity.

_`;
}

function buildThresholdObservation(observation = {}) {
  const threshold = observation.threshold || {};
  const status = statusOf(threshold.status);

  if (!isReadableStatus(status)) {
    return unavailableObservation("EMP GUARDIAN THRESHOLD", status);
  }

  const state =
    threshold.met === true
      ? "MET"
      : threshold.met === false
        ? "NOT MET"
        : "UNKNOWN";

  return `EMP GUARDIAN THRESHOLD · ${freshnessLabel(status)}

Synchronized coherent Guardians:
${formatBigInt(threshold.count)}

Required:
${formatBigInt(threshold.required)}

Remaining:
${formatBigInt(threshold.remaining)}

Threshold:
${state}

_`;
}

function minimumLine(label, value) {
  if (value === true) return `${label}: MET`;
  if (value === false) return `${label}: NOT MET`;
  return `${label}: UNKNOWN`;
}

function buildReserveObservation(observation = {}) {
  const reserves = observation.reserves || {};
  const status = statusOf(reserves.status);

  if (!isReadableStatus(status)) {
    return unavailableObservation("EMP VAULT RESERVES", status);
  }

  const health = reserves.healthLabel || "UNKNOWN";

  const minimums =
    reserves.minimumsMet === true
      ? "MET"
      : reserves.minimumsMet === false
        ? "NOT MET"
        : "UNKNOWN";

  const access =
    reserves.operationallyLocked === true
      ? "LOCKED"
      : reserves.operationallyLocked === false
        ? "OPEN"
        : "UNKNOWN";

  const reason =
    reserves.operationallyLocked === true && reserves.lockReason
      ? `\nReason:\n${reserves.lockReason}\n`
      : "";

  return `EMP VAULT RESERVES · ${freshnessLabel(status)}

Health:
${health}

Minimum reserve set:
${minimums}

Operational state:
${access}
${reason}
${minimumLine("EON minimum", reserves.eon?.minimumMet)}
${minimumLine("USDT0 minimum", reserves.usdt0?.minimumMet)}
${minimumLine("WFLR minimum", reserves.wflr?.minimumMet)}
${minimumLine("FXRP minimum", reserves.fxrp?.minimumMet)}

_`;
}

function tierLine(name, seconds, feeBps) {
  const fee = formatBps(feeBps);

  return `${name}: ${formatDuration(seconds)}${fee ? ` · ${fee}` : ""}`;
}

function buildMaturityObservation(observation = {}) {
  const maturity = observation.maturity || {};
  const status = statusOf(maturity.status);

  if (!isReadableStatus(status)) {
    return unavailableObservation("EMP MATURITY TIERS", status);
  }

  const feeKnown =
    maturity.freeFeeBps !== null &&
    maturity.freeFeeBps !== undefined &&
    maturity.fastFeeBps !== null &&
    maturity.fastFeeBps !== undefined &&
    maturity.rapidFeeBps !== null &&
    maturity.rapidFeeBps !== undefined;

  return `EMP MATURITY TIERS · ${freshnessLabel(status)}

${tierLine("FREE", maturity.free24hSeconds, maturity.freeFeeBps)}
${tierLine("FAST", maturity.fast12hSeconds, maturity.fastFeeBps)}
${tierLine("RAPID", maturity.rapid6hSeconds, maturity.rapidFeeBps)}
${feeKnown ? "" : "\nFee values are not present in the current normalized read."}

_`;
}

function buildIdentityObservation(observation = {}, ctx = {}) {
  const identity = observation.identity || {};
  const coreStatus = statusOf(ctx.readStatus);

  if (coreStatus !== "LIVE") {
    return `CORE / EMP IDENTITY CHECK

Current Core Cube state could not be freshly verified.

Displayed prior Core state is not used to manufacture a Core/EMP conclusion.

Consistency:
UNKNOWN

Core remains canonical.

_`;
  }

  if (identity.consistency === "MISMATCH") {
    return `CORE / EMP IDENTITY CHECK

Core Guardian state:
${identity.coreState || "UNKNOWN"}

EMP-observed Guardian state:
${identity.empState || "UNKNOWN"}

Consistency:
MISMATCH

Core remains canonical.

Q.O.R.I reports the inconsistency instead of replacing Core identity.

_`;
  }

  if (identity.consistency === "MATCH") {
    return `CORE / EMP IDENTITY CHECK

Core Guardian state:
${identity.coreState || "UNKNOWN"}

EMP-observed Guardian state:
${identity.empState || "UNKNOWN"}

Consistency:
MATCH

Core remains canonical.

_`;
  }

  return `CORE / EMP IDENTITY CHECK

Core Guardian state:
${identity.coreState || "UNKNOWN"}

EMP Guardian confirmation:
UNVERIFIED

Consistency:
UNKNOWN

Core remains canonical.

_`;
}

function buildAccessObservation(observation = {}, ctx = {}) {
  const identity = observation.identity || {};
  const registration = observation.registration || {};
  const threshold = observation.threshold || {};
  const reserves = observation.reserves || {};
  const access = observation.access || {};

  const coreStatus = statusOf(ctx.readStatus);

  if (coreStatus !== "LIVE") {
    return `EMP ACCESS CHECK

Current Core Guardian identity could not be freshly verified.

Q.O.R.I will not declare EMP access ready from a stale or failed Core read.

_`;
  }

  if (identity.consistency === "MISMATCH") {
    return `EMP ACCESS CHECK

Core / EMP identity inconsistency detected.

Core remains canonical.

Q.O.R.I will not declare EMP access ready while the identity observations disagree.

_`;
  }

  const statuses = [
    statusOf(registration.status),
    statusOf(threshold.status),
    statusOf(reserves.status),
    statusOf(access.status),
  ];

  if (statuses.some((status) => status === "UNKNOWN")) {
    return `EMP ACCESS CHECK

One or more required EMP reads are UNKNOWN.

Q.O.R.I cannot verify full access readiness.

No failed read is treated as approval.

_`;
  }

  if (statuses.some((status) => status === "STALE")) {
    return `EMP ACCESS CHECK · LAST KNOWN

Some required EMP state is stale.

Q.O.R.I will not declare current access readiness until fresh reads return.

_`;
  }

  if (statuses.some((status) => status === "NOT_CONNECTED")) {
    return `EMP ACCESS CHECK

Connect the wallet to verify wallet-specific EMP access state.

_`;
  }

  if (statuses.some((status) => status === "UNSUPPORTED")) {
    return `EMP ACCESS CHECK

The current read interface does not expose every state required to verify access.

Q.O.R.I will not infer readiness.

_`;
  }

  const blockers = [];

  if (String(ctx.guardianState || "").toUpperCase() !== "COHERENT") {
    blockers.push(`Core Guardian state is ${ctx.guardianState || "UNKNOWN"}.`);
  }

  if (registration.synchronized !== true) {
    blockers.push("EMP Guardian synchronization is not confirmed.");
  }

  if (registration.activationActive !== true) {
    if (
      registration.activationRemaining !== null &&
      registration.activationRemaining !== undefined &&
      registration.activationRemaining > 0n
    ) {
      blockers.push(
        `EMP activation has ${formatDuration(
          registration.activationRemaining,
        )} remaining.`,
      );
    } else {
      blockers.push("EMP activation is not confirmed active.");
    }
  }

  if (threshold.met !== true) {
    blockers.push(
      `Guardian threshold is not met${
        threshold.remaining !== null &&
        threshold.remaining !== undefined
          ? ` (${formatBigInt(threshold.remaining)} remaining)`
          : ""
      }.`,
    );
  }

  if (reserves.operationallyLocked === true) {
    blockers.push(
      reserves.lockReason
        ? `Vault is operationally locked: ${reserves.lockReason}.`
        : "Vault reserves are operationally locked.",
    );
  }

  if (access.canCommit !== true) {
    blockers.push(
      access.commitReason
        ? `Commit access is not currently allowed: ${access.commitReason}.`
        : "Commit access is not currently confirmed.",
    );
  }

  if (blockers.length) {
    return `EMP ACCESS CHECK · LIVE

Access is not currently ready.

${blockers.map((item) => `• ${item}`).join("\n")}

Q.O.R.I observes only.
No transaction has been requested.

_`;
  }

  return `EMP ACCESS CHECK · LIVE

Core Guardian coherence:
CONFIRMED

EMP synchronization:
CONFIRMED

Activation:
ACTIVE

Guardian threshold:
MET

Vault reserves:
OPERATIONAL

Commit access:
ALLOWED

Q.O.R.I observes only.
No transaction has been requested.

_`;
}

function buildOverview(observation = {}, ctx = {}) {
  const identity = observation.identity || {};
  const registration = observation.registration || {};
  const threshold = observation.threshold || {};
  const reserves = observation.reserves || {};

  const identityText =
    statusOf(ctx.readStatus) !== "LIVE"
      ? "UNVERIFIED"
      : identity.consistency === "MATCH"
        ? `MATCH · ${identity.coreState || "UNKNOWN"}`
        : identity.consistency === "MISMATCH"
          ? `MISMATCH · CORE ${identity.coreState || "UNKNOWN"}`
          : "UNKNOWN";

  const registrationStatus = statusOf(registration.status);

  const registrationText = !isReadableStatus(registrationStatus)
    ? registrationStatus
    : registration.synchronized === true
      ? `SYNCHRONIZED · ${freshnessLabel(registrationStatus)}`
      : registration.synchronized === false
        ? `NOT SYNCHRONIZED · ${freshnessLabel(registrationStatus)}`
        : `UNKNOWN · ${freshnessLabel(registrationStatus)}`;

  const thresholdStatus = statusOf(threshold.status);

  const thresholdText = !isReadableStatus(thresholdStatus)
    ? thresholdStatus
    : `${formatBigInt(threshold.count)} / ${formatBigInt(
        threshold.required,
      )} · ${
        threshold.met === true
          ? "MET"
          : threshold.met === false
            ? "NOT MET"
            : "UNKNOWN"
      } · ${freshnessLabel(thresholdStatus)}`;

  const reserveStatus = statusOf(reserves.status);

  const reserveText = !isReadableStatus(reserveStatus)
    ? reserveStatus
    : `${reserves.healthLabel || "UNKNOWN"} · ${
        reserves.operationallyLocked === true
          ? "LOCKED"
          : reserves.operationallyLocked === false
            ? "OPERATIONAL"
            : "UNKNOWN"
      } · ${freshnessLabel(reserveStatus)}`;

  return `EMP OBSERVATION

Core / EMP identity:
${identityText}

Wallet registration:
${registrationText}

Guardian threshold:
${thresholdText}

Vault reserves:
${reserveText}

Core Guardian identity remains canonical.

Q.O.R.I observes.
Q.O.R.I does not intervene.

_`;
}

function isNavigationOnly(q) {
  return [
    "6",
    "read emp",
    "read the emp",
    "open emp",
    "open the emp",
    "emp pdf",
    "open emp pdf",
    "emp document",
  ].includes(q);
}

function isEmpQuery(q) {
  return (
    hasAny(q, ["emp", "evault", "e-vault", "vault"]) ||
    hasAny(q, [
      "am i synchronized",
      "am i synchronised",
      "am i synced",
      "sync status",
      "guardian registration",
      "registered cube",
      "activation delay",
      "how many guardians",
      "guardians registered",
      "guardian count",
      "guardian threshold",
      "are reserves healthy",
      "reserve health",
      "minimum reserves",
      "can i commit",
      "commit access",
      "access the vault",
    ])
  );
}

export function buildEmpDialogueResponse(cleanInput, ctx = {}) {
  const q = normalizeInput(cleanInput);

  if (!q || isNavigationOnly(q) || !isEmpQuery(q)) return "";

  const observation = ctx.empObservation;

  if (!observation) {
    return `EMP OBSERVATION

Live EMP observation is not available in the current Q.O.R.I context.

Q.O.R.I will not invent protocol state.

_`;
  }

  if (
    hasAny(q, [
      "how many guardians",
      "guardians registered",
      "guardian count",
      "guardian threshold",
      "threshold",
    ])
  ) {
    return buildThresholdObservation(observation);
  }

  if (
    hasAny(q, [
      "am i synchronized",
      "am i synchronised",
      "am i synced",
      "synchronized",
      "synchronised",
      "synced",
      "sync status",
      "guardian registration",
      "registered cube",
      "activation delay",
      "activation status",
    ])
  ) {
    return buildRegistrationObservation(observation);
  }

  if (
    hasAny(q, [
      "reserve",
      "reserves",
      "vault health",
      "healthy",
      "minimum reserves",
      "below minimum",
      "coverage",
    ])
  ) {
    return buildReserveObservation(observation);
  }

  if (
    hasAny(q, [
      "maturity",
      "rapid",
      "fast",
      "free tier",
      "6 hour",
      "12 hour",
      "24 hour",
    ])
  ) {
    return buildMaturityObservation(observation);
  }

  if (
    hasAny(q, [
      "can i access",
      "when can i access",
      "vault access",
      "access the vault",
      "can i commit",
      "commit access",
      "why locked",
      "why is the vault locked",
      "access locked",
    ])
  ) {
    return buildAccessObservation(observation, ctx);
  }

  if (
    hasAny(q, [
      "core vs emp",
      "core and emp",
      "identity mismatch",
      "emp guardian state",
      "guardian mismatch",
      "mismatch",
    ])
  ) {
    return buildIdentityObservation(observation, ctx);
  }

  return buildOverview(observation, ctx);
}
