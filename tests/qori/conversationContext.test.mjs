import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const modulePath = path.resolve(
  "src/components/qori/conversation/conversationContext.js"
);

const available = fs.existsSync(modulePath);

const module = available
  ? await import(pathToFileURL(modulePath).href)
  : {};

const advance = module.advanceConversationContext;

test("Conversation context module is available", () => {
  assert.equal(
    typeof advance,
    "function",
    "Conversation context resolver has not been implemented"
  );
});

test("EMP question establishes EMP context", {
  skip: !available,
}, () => {
  const result = advance("What is EMP?", null, "visitor");

  assert.equal(result.subject, "emp");
  assert.equal(result.followUp, false);
});

test("Follow-up remembers EMP", {
  skip: !available,
}, () => {
  const previous = {
    subject: "emp",
    scopeKey: "visitor"
  };

  const result = advance(
    "How does it work?",
    previous,
    "visitor"
  );

  assert.equal(result.subject, "emp");
  assert.equal(result.followUp, true);
});

test("Explicit Network question changes subject", {
  skip: !available,
}, () => {
  const previous = {
    subject: "emp",
    scopeKey: "visitor"
  };

  const result = advance(
    "What about Energon Network?",
    previous,
    "visitor"
  );

  assert.equal(result.subject, "network");
  assert.equal(result.followUp, false);
});

test("New wallet cannot inherit another wallet's context", {
  skip: !available,
}, () => {
  const previous = {
    subject: "evault",
    scopeKey: "guardian:wallet-a"
  };

  const result = advance(
    "How does it work?",
    previous,
    "guardian:wallet-b"
  );

  assert.equal(result.subject, "");
  assert.equal(result.followUp, false);
});
