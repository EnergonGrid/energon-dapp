import test from "node:test";
import assert from "node:assert/strict";
import {
  VISITOR_WELCOME,
  VISITOR_DECLINE,
} from "../../src/components/qori/conversation/visitorGuidance.js";
import {
  LEARNING_PATHS,
  planLearningTurn as plan,
} from "../../src/components/qori/conversation/visitorLearningCycle.js";

test("Approved Visitor dialogue remains intact", () => {
  assert.match(VISITOR_WELCOME, /Would you like to hear more/);
  assert.equal(
    LEARNING_PATHS.energon.question,
    "Would you like to know what makes someone a Guardian?"
  );
  assert.match(VISITOR_DECLINE, /No problem/);
});

test("Yes to original welcome teaches Energon", () => {
  assert.deepEqual(plan("yes", "welcome", "welcome"), {
    action: "lesson",
    topic: "energon",
    pending: "learn:energon",
  });
});

test("Guardian learning continues to wallet preparation", () => {
  assert.equal(plan("yes", "learn:energon").topic, "cube");
  assert.equal(plan("yes", "learn:cube").topic, "wallet");
});

test("No respects the Visitor's choice", () => {
  for (const pending of ["welcome", "learn:energon", "learn:cube"]) {
    assert.deepEqual(plan("no", pending), {
      action: "decline",
      pending: "",
    });
  }
});

test("Home, list and menu always return choices", () => {
  for (const word of ["home", "list", "menu", "HOME"]) {
    assert.equal(plan(word, "learn:energon").action, "menu");
  }
});

test("Independent questions remain unrestricted", () => {
  assert.equal(plan("What is EVault?", "learn:energon").topic, "evault");
  assert.equal(plan("Who created Bitcoin?", "learn:energon").action, "freeform");
  assert.equal(plan("yes").action, "freeform");
  assert.equal(plan("no").action, "freeform");
});
