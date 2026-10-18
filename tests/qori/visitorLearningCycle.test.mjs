import test from "node:test";
import assert from "node:assert/strict";
import {
  LEARNING_PATHS,
  OPENING_TOPICS,
  planLearningTurn as plan,
} from "../../src/components/qori/conversation/visitorLearningCycle.js";

test("All 12 openings begin the correct lesson", () => {
  for (const [id, topic] of Object.entries(OPENING_TOPICS)) {
    const result = plan("yes", "welcome", id);
    assert.equal(result.action, "lesson");
    assert.equal(result.topic, topic);
  }
});

test("Energon learning continues to Observer", () => {
  let result = plan("What is Energon?");
  const visited = [];

  for (let i = 0; i < 15 && result.action === "lesson"; i++) {
    visited.push(result.topic);
    result = plan("yes", result.pending);
  }

  assert.deepEqual(visited, [
    "energon", "cube", "wallet", "whitepaper",
    "emp", "evault", "network", "grid", "observer"
  ]);
  assert.equal(result.action, "navigate-observer");
});

test("No stops learning at every subject", () => {
  for (const topic of Object.keys(LEARNING_PATHS)) {
    const result = plan("no", `learn:${topic}`);
    assert.deepEqual(result, { action: "decline", pending: "" });
  }
});

test("Home stops learning at every subject", () => {
  for (const topic of Object.keys(LEARNING_PATHS)) {
    const result = plan("home", `learn:${topic}`);
    assert.deepEqual(result, { action: "menu", pending: "" });
  }
});

test("Independent questions stop pending guidance", () => {
  const result = plan("Who created Bitcoin?", "learn:evault");
  assert.deepEqual(result, { action: "freeform", pending: "" });
});

test("EON and Clock lead into existing education", () => {
  assert.equal(plan("yes", "learn:eon").topic, "emp");
  assert.equal(plan("yes", "learn:clock").topic, "eon");
});

test("Existing menu navigation commands remain available", () => {
  for (const command of ["4", "5", "6", "7", "8"]) {
    assert.equal(plan(command).action, "freeform", command);
  }
});

test("Explicit document commands are not intercepted", () => {
  for (const command of [
    "Read Whitepaper",
    "Read EMP",
    "Open Mint",
    "Guardian Chronicle",
  ]) {
    assert.equal(plan(command).action, "freeform", command);
  }
});

test("Educational questions enter the learning cycle", () => {
  assert.equal(plan("What is Energon?").topic, "energon");
  assert.equal(plan("What is EMP?").topic, "emp");
  assert.equal(plan("What is EVault?").topic, "evault");
  assert.equal(plan("What is the Observer?").topic, "observer");
});
