import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/qori/QoriNode.js",
  "utf8"
);

const effects = fs.readFileSync(
  "src/components/qori/qoriEffects.js",
  "utf8"
);

const start = source.indexOf(
  "function handleVisitorMessage(cleanInput)"
);

const end = source.indexOf(
  "function handleCoherentMessage(cleanInput)"
);

assert.ok(start >= 0, "Visitor handler not found");
assert.ok(end > start, "Guardian handler boundary not found");

const visitorHandler = source.slice(start, end);

test("Visitor answers do not inject SIGNAL DRIFT", () => {
  assert.doesNotMatch(
    visitorHandler,
    /maybeAddSignalDegradation\s*\(/,
    "Visitor answers still include random SIGNAL DRIFT"
  );
});

test("SIGNAL DRIFT effect remains available", () => {
  assert.match(
    effects,
    /export function maybeAddSignalDegradation\s*\(/
  );
});

test("Visitor knowledge and Creator Echo remain connected", () => {
  assert.match(visitorHandler, /getQoriResponse\s*\(/);
  assert.match(visitorHandler, /getVisitorEchoResponse\s*\(/);
});
