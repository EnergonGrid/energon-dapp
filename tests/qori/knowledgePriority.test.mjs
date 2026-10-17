import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dataUrl = (text) =>
  "data:text/javascript;base64," +
  Buffer.from(text).toString("base64");

const matcher = fs.readFileSync(
  "src/components/qori/conversation/matchUtils.js",
  "utf8"
);

const original = fs.readFileSync(
  "src/components/qori/qoriKnowledge.js",
  "utf8"
);

const source = original.replace(
  'from "./conversation/matchUtils";',
  `from "${dataUrl(matcher)}";`
);

assert.notEqual(source, original, "Import resolution failed");

const { getQoriResponse } = await import(dataUrl(source));

test("Wallet setup takes priority over generic Energon", () => {
  const answer = getQoriResponse(
    "How do I set up a wallet for Energon?",
    { mode: "visitor" }
  );

  assert.match(answer, /^WALLET SETUP/);
  assert.match(answer, /Bifrost/);
});

test("Simple wallet question still works", () => {
  const answer = getQoriResponse(
    "How do I set up a wallet?",
    { mode: "visitor" }
  );

  assert.match(answer, /^WALLET SETUP/);
});

test("Basic Energon explanation remains available", () => {
  const answer = getQoriResponse(
    "What is Energon?",
    { mode: "visitor" }
  );

  assert.match(answer, /^ENERGON/);
});
