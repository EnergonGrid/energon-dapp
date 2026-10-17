import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/qori/QoriNode.js",
  "utf8"
);

const start = source.indexOf(
  "function handleCoherentMessage(cleanInput)"
);

const end = source.indexOf(
  "async function refreshLiveState",
  start
);

assert.ok(start >= 0 && end > start);

const guardian = source.slice(start, end);

test("EMP questions are checked before generic status", () => {
  const emp = guardian.indexOf(
    "buildEmpDialogueResponse("
  );

  const status = guardian.indexOf(
    'q.includes("status")'
  );

  assert.ok(
    emp >= 0 && emp < status,
    "EMP-specific handling must precede generic status"
  );

  const empSection = guardian.slice(emp, status);

  assert.match(empSection, /if\s*\(empResponse\)/);
  assert.match(empSection, /answerLive\(empResponse\)/);
});

test("Generic Guardian status remains available", () => {
  assert.match(
    guardian,
    /q\.includes\("status"\)/
  );
});

test("Existing Guardian dialogue remains connected", () => {
  assert.match(
    guardian,
    /buildGuardianDialogueResponse\(/
  );
});
