import test from "node:test";
import assert from "node:assert/strict";

import * as context from "../../src/components/qori/conversation/conversationContext.js";

const advance = context.advanceConversationContext;
const resolve = context.resolveContextualQuery;

const available = typeof resolve === "function";

function conversation(first, second, scope = "visitor") {
  const initial = advance(first, null, scope);
  return advance(second, initial, scope);
}

test("Contextual query resolver exists", () => {
  assert.equal(typeof resolve, "function");
});

test("EMP follow-up retains EMP subject", { skip: !available }, () => {
  const state = conversation("What is EMP?", "How does it work?");

  assert.equal(state.subject, "emp");
  assert.equal(state.followUp, true);
  assert.equal(
    resolve("How does it work?", state),
    "how does emp work"
  );
});

test("EVault follow-up retains EVault subject", { skip: !available }, () => {
  const state = conversation("What is EVault?", "Tell me more");

  assert.equal(
    resolve("Tell me more", state),
    "what is evault"
  );
});

test("Network follow-up retains Network subject", { skip: !available }, () => {
  const state = conversation(
    "What is Energon Network?",
    "How does it work?"
  );

  assert.equal(
    resolve("How does it work?", state),
    "how does energon network work"
  );
});

test("Explicit subject change remains untouched", { skip: !available }, () => {
  const state = conversation(
    "What is EMP?",
    "What about Energon Network?"
  );

  assert.equal(state.subject, "network");
  assert.equal(
    resolve("What about Energon Network?", state),
    "What about Energon Network?"
  );
});

test("Live EMP status question remains untouched", { skip: !available }, () => {
  const state = advance("What is my EMP status?", null, "visitor");

  assert.equal(
    resolve("What is my EMP status?", state),
    "What is my EMP status?"
  );
});

test("Document navigation remains untouched", { skip: !available }, () => {
  const state = advance("Read EMP", null, "visitor");

  assert.equal(resolve("Read EMP", state), "Read EMP");
});

test("Different Guardian cannot inherit subject", { skip: !available }, () => {
  const first = advance(
    "What is EVault?",
    null,
    "guardian:wallet-a"
  );

  const second = advance(
    "How does it work?",
    first,
    "guardian:wallet-b"
  );

  assert.equal(second.subject, "");
  assert.equal(
    resolve("How does it work?", second),
    "How does it work?"
  );
});

test("Unrelated messages are not rewritten", { skip: !available }, () => {
  const state = advance("Good morning", null, "visitor");

  assert.equal(
    resolve("Good morning", state),
    "Good morning"
  );
});
