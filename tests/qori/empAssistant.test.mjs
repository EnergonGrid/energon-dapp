import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { buildEmpDialogueResponse } from "../../src/components/qori/conversation/empAssistant.js";

function observation(overrides = {}) {
  const base = {
    connected: true,
    identity: {
      canonicalSource: "CORE",
      coreState: "COHERENT",
      empState: "COHERENT",
      consistency: "MATCH",
      status: "LIVE",
    },
    registration: {
      synchronized: true,
      registeredCubeId: 1n,
      syncedAt: 1n,
      activeAt: 2n,
      activationRemaining: 0n,
      activationActive: true,
      status: "LIVE",
    },
    access: {
      contributionAllowed: true,
      guardianActionsAllowed: true,
      canCommit: true,
      commitReason: "OK",
      cooldownRemaining: 0n,
      openClaims: 0n,
      status: "LIVE",
    },
    threshold: {
      count: 0n,
      required: 250000n,
      remaining: 250000n,
      met: false,
      status: "LIVE",
    },
    reserves: {
      eon: { minimumMet: false },
      usdt0: { minimumMet: false },
      wflr: { minimumMet: false },
      fxrp: { minimumMet: false },
      minimumsMet: false,
      operationallyLocked: true,
      lockReason: "vault reserves below minimum",
      healthLabel: "LOCKED",
      status: "LIVE",
    },
    maturity: {
      free24hSeconds: 86400n,
      fast12hSeconds: 43200n,
      rapid6hSeconds: 21600n,
      freeFeeBps: null,
      fastFeeBps: null,
      rapidFeeBps: null,
      status: "LIVE",
    },
  };

  return {
    ...base,
    ...overrides,
    identity: { ...base.identity, ...(overrides.identity || {}) },
    registration: { ...base.registration, ...(overrides.registration || {}) },
    access: { ...base.access, ...(overrides.access || {}) },
    threshold: { ...base.threshold, ...(overrides.threshold || {}) },
    reserves: { ...base.reserves, ...(overrides.reserves || {}) },
    maturity: { ...base.maturity, ...(overrides.maturity || {}) },
  };
}

function ctx(overrides = {}) {
  return {
    walletConnected: true,
    walletAddress: "0x1111111111111111111111111111111111111111",
    readStatus: "LIVE",
    guardianState: "COHERENT",
    empObservation: observation(),
    ...overrides,
  };
}

test("unrelated dialogue is not intercepted by EMP assistant", () => {
  assert.equal(
    buildEmpDialogueResponse("what are you focused on today", ctx()),
    "",
  );
});

test("Read EMP remains a navigation command rather than a live-state query", () => {
  assert.equal(buildEmpDialogueResponse("read emp", ctx()), "");
});

test("EMP overview reports Core canonical identity and live global state", () => {
  const out = buildEmpDialogueResponse("how is the emp", ctx());

  assert.match(out, /EMP OBSERVATION/);
  assert.match(out, /Core \/ EMP identity:\nMATCH · COHERENT/);
  assert.match(out, /0 \/ 250,000 · NOT MET · LIVE/);
  assert.match(out, /Core Guardian identity remains canonical/);
});

test("real zero Guardian threshold remains zero", () => {
  const out = buildEmpDialogueResponse(
    "how many guardians are registered",
    ctx(),
  );

  assert.match(out, /Synchronized coherent Guardians:\n0/);
  assert.match(out, /Required:\n250,000/);
  assert.match(out, /Threshold:\nNOT MET/);
});

test("UNKNOWN threshold never becomes zero", () => {
  const c = ctx({
    empObservation: observation({
      threshold: {
        count: null,
        required: null,
        remaining: null,
        met: null,
        status: "UNKNOWN",
      },
    }),
  });

  const out = buildEmpDialogueResponse("guardian threshold", c);

  assert.match(out, /Current EMP state could not be verified/);
  assert.match(out, /No read is not treated as zero/);
  assert.doesNotMatch(out, /Synchronized coherent Guardians:\n0/);
});

test("STALE threshold is labeled last known", () => {
  const c = ctx({
    empObservation: observation({
      threshold: {
        count: 12n,
        required: 250000n,
        remaining: 249988n,
        met: false,
        status: "STALE",
      },
    }),
  });

  const out = buildEmpDialogueResponse("guardian count", c);

  assert.match(out, /EMP GUARDIAN THRESHOLD · LAST KNOWN/);
  assert.match(out, /12/);
});

test("wallet synchronization answer stays separate from Core identity", () => {
  const out = buildEmpDialogueResponse("am i synchronized", ctx());

  assert.match(out, /EMP GUARDIAN REGISTRATION · LIVE/);
  assert.match(out, /SYNCHRONIZED/);
  assert.match(
    out,
    /EMP synchronization does not redefine Core Guardian identity/,
  );
});

test("disconnected wallet synchronization does not report false unregistered state", () => {
  const c = ctx({
    walletConnected: false,
    walletAddress: "",
    readStatus: "NOT_CONNECTED",
    guardianState: "UNKNOWN",
    empObservation: observation({
      registration: {
        synchronized: null,
        registeredCubeId: null,
        syncedAt: null,
        activeAt: null,
        activationRemaining: null,
        activationActive: null,
        status: "NOT_CONNECTED",
      },
    }),
  });

  const out = buildEmpDialogueResponse("am i synchronized", c);

  assert.match(out, /requires a connected wallet/);
  assert.doesNotMatch(out, /NOT SYNCHRONIZED/);
});

test("reserve health reports live lock without inventing balances", () => {
  const out = buildEmpDialogueResponse("are reserves healthy", ctx());

  assert.match(out, /EMP VAULT RESERVES · LIVE/);
  assert.match(out, /Health:\nLOCKED/);
  assert.match(out, /Operational state:\nLOCKED/);
  assert.match(out, /vault reserves below minimum/);
});

test("access check refuses readiness when Core current read is not LIVE", () => {
  const out = buildEmpDialogueResponse(
    "when can i access the vault",
    ctx({ readStatus: "UNKNOWN" }),
  );

  assert.match(out, /could not be freshly verified/);
  assert.match(out, /will not declare EMP access ready/);
});

test("Core/EMP mismatch is surfaced and Core remains canonical", () => {
  const c = ctx({
    empObservation: observation({
      identity: {
        coreState: "COHERENT",
        empState: "SILENT",
        consistency: "MISMATCH",
        status: "LIVE",
      },
    }),
  });

  const out = buildEmpDialogueResponse("core vs emp", c);

  assert.match(out, /MISMATCH/);
  assert.match(out, /Core remains canonical/);
});

test("maturity answer preserves live tier timings without inventing missing fees", () => {
  const out = buildEmpDialogueResponse(
    "what are the emp maturity tiers",
    ctx(),
  );

  assert.match(out, /FREE: 1d 0h/);
  assert.match(out, /FAST: 12h 0m/);
  assert.match(out, /RAPID: 6h 0m/);
  assert.match(
    out,
    /Fee values are not present in the current normalized read/,
  );
});

test("EMP assistant is read-only and imports no transaction machinery", () => {
  const sourcePath = fileURLToPath(
    new URL(
      "../../src/components/qori/conversation/empAssistant.js",
      import.meta.url,
    ),
  );

  const source = fs.readFileSync(sourcePath, "utf8");

  assert.doesNotMatch(
    source,
    /useWriteContract|writeContract|sendTransaction|sendTx/,
  );

  assert.doesNotMatch(source, /privateKey|seed phrase|mnemonic/i);
});
