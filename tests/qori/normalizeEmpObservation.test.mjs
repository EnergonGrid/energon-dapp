import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const modulePath = path.resolve("src/lib/qori/normalizeEmpObservation.js");
const source = fs.readFileSync(modulePath, "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { normalizeEmpObservation, READ_STATUS } = await import(moduleUrl);

const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";

function core(state, balance, address = A, readStatus = "LIVE") {
  return {
    walletConnected: true,
    walletAddress: address,
    guardianState: state,
    cubeBalance: balance,
    readStatus,
  };
}

function liveEmp(overrides = {}) {
  return {
    readStatus: {
      guardian: "LIVE",
      registration: "LIVE",
      access: "LIVE",
      threshold: "LIVE",
      reserves: "LIVE",
      maturity: "LIVE",
    },
    cubeBalance: 1n,
    isCoherent: true,
    guardianAlreadySynced: false,
    registeredGuardianCubeId: 0n,
    guardianSyncedAt: 0n,
    guardianActiveAt: 0n,
    guardianActivationRemaining: 0n,
    guardianActivationActive: false,
    guardianStatus: [1n, true, true, false, 0n, 0n],
    canCommit: [false, "Guardian threshold not met"],
    coherentGuardianCount: 0n,
    guardianUnlockThreshold: 250000n,
    guardiansRemainingToUnlock: 250000n,
    guardianThresholdMet: false,
    activeVaultEonBal: 0n,
    reservedEon: 0n,
    eonFree: 0n,
    minEonReserve: 50000n,
    requiredEonReserve: 50000n,
    activeVaultUsdt0Bal: 0n,
    reservedUsdt0: 0n,
    usdt0Free: 0n,
    minUsdt0Reserve: 500n,
    requiredUsdt0Reserve: 500n,
    activeVaultWflrBal: 0n,
    minWflrReserve: 50n,
    activeVaultFxrpBal: 0n,
    minFxrpReserve: 5n,
    eonMinMet: false,
    usdt0MinMet: false,
    wflrMinMet: false,
    fxrpMinMet: false,
    minimumsMet: false,
    operationallyLocked: true,
    operationalLockReason: "vault reserves below minimum",
    healthLabel: "LOCKED",
    maturityFree24h: 86400n,
    maturityFast12h: 43200n,
    maturityRapid6h: 21600n,
    maturityFreeFeeBps: 0n,
    maturityFastFeeBps: 1000n,
    maturityRapidFeeBps: 2000n,
    ...overrides,
  };
}

test("Core/EMP coherent identity agreement is MATCH and Core stays canonical", () => {
  const out = normalizeEmpObservation({ core: core("COHERENT", "1"), emp: liveEmp() });
  assert.equal(out.identity.canonicalSource, "CORE");
  assert.equal(out.identity.coreState, "COHERENT");
  assert.equal(out.identity.empState, "COHERENT");
  assert.equal(out.identity.consistency, "MATCH");
});

test("Core/EMP disagreement is MISMATCH without overwriting Core", () => {
  const out = normalizeEmpObservation({
    core: core("COHERENT", "1"),
    emp: liveEmp({ cubeBalance: 0n, isCoherent: false }),
  });
  assert.equal(out.identity.coreState, "COHERENT");
  assert.equal(out.identity.empState, "SILENT");
  assert.equal(out.identity.consistency, "MISMATCH");
});

test("UNKNOWN Core cannot be promoted by a coherent EMP observation", () => {
  const out = normalizeEmpObservation({ core: core("UNKNOWN", "-"), emp: liveEmp() });
  assert.equal(out.identity.coreState, "UNKNOWN");
  assert.equal(out.identity.consistency, "UNKNOWN");
});

test("stale-looking Core values with a failed current Core read cannot create a mismatch", () => {
  const out = normalizeEmpObservation({
    core: core("COHERENT", "1", A, "UNKNOWN"),
    emp: liveEmp({ cubeBalance: 0n, isCoherent: false }),
  });
  assert.equal(out.identity.coreState, "COHERENT");
  assert.equal(out.identity.empState, "SILENT");
  assert.equal(out.identity.consistency, "UNKNOWN");
});

test("missing Core read status is never assumed LIVE", () => {
  const coreWithoutStatus = core("COHERENT", "1");
  delete coreWithoutStatus.readStatus;

  const out = normalizeEmpObservation({
    core: coreWithoutStatus,
    emp: liveEmp({ cubeBalance: 0n, isCoherent: false }),
  });

  assert.equal(out.identity.consistency, "UNKNOWN");
});

test("UNKNOWN EMP guardian read does not create a false mismatch", () => {
  const emp = liveEmp();
  emp.readStatus.guardian = "UNKNOWN";
  const out = normalizeEmpObservation({ core: core("COHERENT", "1"), emp });
  assert.equal(out.identity.empCubeBalance, null);
  assert.equal(out.identity.empCoherent, null);
  assert.equal(out.identity.consistency, "UNKNOWN");
  assert.equal(out.identity.status, "UNKNOWN");
});

test("successful real zero remains zero", () => {
  const out = normalizeEmpObservation({ core: core("COHERENT", "1"), emp: liveEmp() });
  assert.equal(out.threshold.count, 0n);
  assert.equal(out.threshold.status, "LIVE");
  assert.equal(out.registration.registeredCubeId, 0n);
});

test("failed zero-like read becomes UNKNOWN rather than zero", () => {
  const emp = liveEmp({ coherentGuardianCount: 0n });
  emp.readStatus.threshold = "UNKNOWN";
  const out = normalizeEmpObservation({ core: core("COHERENT", "1"), emp });
  assert.equal(out.threshold.count, null);
  assert.equal(out.threshold.status, "UNKNOWN");
});

test("successful false remains false", () => {
  const out = normalizeEmpObservation({ core: core("COHERENT", "1"), emp: liveEmp() });
  assert.equal(out.registration.synchronized, false);
  assert.equal(out.registration.activationActive, false);
  assert.equal(out.threshold.met, false);
});

test("failed false-like registration read becomes UNKNOWN", () => {
  const emp = liveEmp();
  emp.readStatus.registration = "UNKNOWN";
  const out = normalizeEmpObservation({ core: core("COHERENT", "1"), emp });
  assert.equal(out.registration.synchronized, null);
  assert.equal(out.registration.activationActive, null);
  assert.equal(out.registration.status, "UNKNOWN");
});

test("registration and activation live values are preserved exactly", () => {
  const out = normalizeEmpObservation({
    core: core("COHERENT", "1"),
    emp: liveEmp({
      guardianAlreadySynced: true,
      registeredGuardianCubeId: 77n,
      guardianSyncedAt: 1000n,
      guardianActiveAt: 44200n,
      guardianActivationRemaining: 43200n,
      guardianActivationActive: true,
    }),
  });
  assert.equal(out.registration.synchronized, true);
  assert.equal(out.registration.registeredCubeId, 77n);
  assert.equal(out.registration.syncedAt, 1000n);
  assert.equal(out.registration.activeAt, 44200n);
  assert.equal(out.registration.activationRemaining, 43200n);
  assert.equal(out.registration.activationActive, true);
});

test("threshold live values are preserved exactly", () => {
  const out = normalizeEmpObservation({
    core: core("COHERENT", "1"),
    emp: liveEmp({
      coherentGuardianCount: 100n,
      guardianUnlockThreshold: 250000n,
      guardiansRemainingToUnlock: 249900n,
      guardianThresholdMet: false,
    }),
  });
  assert.deepEqual(
    {
      count: out.threshold.count,
      required: out.threshold.required,
      remaining: out.threshold.remaining,
      met: out.threshold.met,
    },
    { count: 100n, required: 250000n, remaining: 249900n, met: false },
  );
});

test("same-wallet failed read preserves last-known registration as STALE", () => {
  const previous = normalizeEmpObservation({
    core: core("COHERENT", "1"),
    emp: liveEmp({ guardianAlreadySynced: true, registeredGuardianCubeId: 9n }),
  });
  const emp = liveEmp();
  emp.readStatus.registration = "UNKNOWN";
  const out = normalizeEmpObservation({
    core: core("COHERENT", "1"),
    emp,
    previous,
  });
  assert.equal(out.registration.synchronized, true);
  assert.equal(out.registration.registeredCubeId, 9n);
  assert.equal(out.registration.status, "STALE");
});

test("global stale threshold survives a failed read", () => {
  const previous = normalizeEmpObservation({
    core: core("COHERENT", "1"),
    emp: liveEmp({ coherentGuardianCount: 42n, guardiansRemainingToUnlock: 249958n }),
  });
  const emp = liveEmp();
  emp.readStatus.threshold = "UNKNOWN";
  const out = normalizeEmpObservation({ core: core("COHERENT", "1"), emp, previous });
  assert.equal(out.threshold.count, 42n);
  assert.equal(out.threshold.status, "STALE");
});

test("wallet change clears wallet-specific stale state but preserves global stale state", () => {
  const previous = normalizeEmpObservation({
    core: core("COHERENT", "1", A),
    emp: liveEmp({
      guardianAlreadySynced: true,
      registeredGuardianCubeId: 12n,
      coherentGuardianCount: 500n,
      guardiansRemainingToUnlock: 249500n,
    }),
  });

  const emp = liveEmp();
  emp.readStatus.guardian = "UNKNOWN";
  emp.readStatus.registration = "UNKNOWN";
  emp.readStatus.access = "UNKNOWN";
  emp.readStatus.threshold = "UNKNOWN";

  const out = normalizeEmpObservation({
    core: core("COHERENT", "1", B),
    emp,
    previous,
  });

  assert.equal(out.registration.synchronized, null);
  assert.equal(out.registration.registeredCubeId, null);
  assert.equal(out.registration.status, "UNKNOWN");
  assert.equal(out.threshold.count, 500n);
  assert.equal(out.threshold.status, "STALE");
});

test("FRACTURED Core remains canonical when EMP agrees", () => {
  const out = normalizeEmpObservation({
    core: core("FRACTURED", "2"),
    emp: liveEmp({ cubeBalance: 2n, isCoherent: false }),
  });
  assert.equal(out.identity.coreState, "FRACTURED");
  assert.equal(out.identity.empState, "FRACTURED");
  assert.equal(out.identity.consistency, "MATCH");
});

test("FRACTURED Core is not collapsed into generic EMP false coherence", () => {
  const out = normalizeEmpObservation({
    core: core("FRACTURED", "2"),
    emp: liveEmp({ cubeBalance: 0n, isCoherent: false }),
  });
  assert.equal(out.identity.coreState, "FRACTURED");
  assert.equal(out.identity.consistency, "MISMATCH");
});

test("maturity zero fee and configured timing remain valid LIVE values", () => {
  const out = normalizeEmpObservation({ core: core("COHERENT", "1"), emp: liveEmp() });
  assert.equal(out.maturity.freeFeeBps, 0n);
  assert.equal(out.maturity.fastFeeBps, 1000n);
  assert.equal(out.maturity.rapidFeeBps, 2000n);
  assert.equal(out.maturity.free24hSeconds, 86400n);
});

test("normalization module contains no state-changing or write imports", () => {
  const forbidden = [
    "useWriteContract",
    "useEmpActions",
    "useEmpCommits",
    "useEmpClaimActions",
    "writeContract",
    "simulateContract",
    "ethers",
    "viem",
    "EVault.json",
    "contract.js",
  ];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token present: ${token}`);
  }

  assert.equal(/^\s*import\s/m.test(source), false, "normalizer must have no imports");
});

test("read status constants expose the approved states", () => {
  assert.deepEqual(
    Object.values(READ_STATUS).sort(),
    ["LIVE", "NOT_CONNECTED", "STALE", "UNKNOWN", "UNSUPPORTED"].sort(),
  );
});
