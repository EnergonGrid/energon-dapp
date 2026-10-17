import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/qori/QoriNode.js",
  "utf8"
);

test("Creator Echo must not replace the requested answer", () => {
  assert.doesNotMatch(
    source,
    /visitorEcho\s*\|\|\s*getQoriResponse\s*\(/,
    "Creator Echo currently overrides the knowledge answer"
  );
});

test("Visitor knowledge answering remains connected", () => {
  assert.match(
    source,
    /getQoriResponse\s*\(\s*query\s*,\s*\{\s*mode:\s*"visitor"\s*\}\s*\)/
  );
});

test("Creator Echo system remains connected", () => {
  assert.match(
    source,
    /getVisitorEchoResponse\s*\(\s*cleanInput\s*\)/
  );
});
