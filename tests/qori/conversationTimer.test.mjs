import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/qori/QoriNode.js",
  "utf8"
);

test("Visitor answers have no automatic menu-return timer", () => {
  assert.doesNotMatch(
    source,
    /scheduleReturnToVisitorMenu\s*\(/,
    "Automatic Visitor menu-return scheduling still exists"
  );
});

test("Typing inactivity cannot force the Visitor menu", () => {
  assert.doesNotMatch(
    source,
    /resetReturnMenuAfterTyping\s*\(/,
    "Input inactivity can still trigger a menu reset"
  );
});

test("Explicit Visitor menu remains available", () => {
  assert.match(source, /function showVisitorMenu\s*\(/);
  assert.match(source, /getVisitorMenu\s*\(/);
});

test("Four-minute idle indicator remains available", () => {
  assert.match(
    source,
    /scheduleSessionTimeout\(\(\)\s*=>\s*setSilent\(true\),\s*240000\)/
  );
});
