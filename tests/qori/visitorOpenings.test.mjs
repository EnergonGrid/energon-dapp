import test from "node:test";
import assert from "node:assert/strict";
import {
  getVisitorOpenings,
  pickVisitorOpening
} from "../../src/components/qori/conversation/visitorOpenings.js";
import {
  planLearningTurn,
  OPENING_TOPICS,
} from "../../src/components/qori/conversation/visitorLearningCycle.js";
import {
  getVisitorTopicAnswer
} from "../../src/components/qori/conversation/visitorTopicAnswers.js";

const openings = getVisitorOpenings("Original welcome");

test("All 12 introductions are unique", () => {
  assert.equal(openings.length, 12);
  assert.equal(new Set(openings.map(o => o.id)).size, 12);
});

test("Every introduction can be randomly selected", () => {
  openings.forEach((opening, i) => {
    const picked = pickVisitorOpening("Original welcome", () => (i + 0.5) / 12);
    assert.equal(picked.id, opening.id);
  });
});

test("Yes follows the correct topic for all 12 openings", () => {
  for (const opening of openings) {
    const answer = planLearningTurn("yes", "welcome", opening.id);
    assert.equal(answer.action, "lesson", opening.id);
    assert.equal(answer.topic, OPENING_TOPICS[opening.id], opening.id);
  }
});

test("EON and Observer have distinct second responses", () => {
  assert.equal(
    planLearningTurn("yes", "learn:eon").topic, "emp"
  );
  assert.equal(
    planLearningTurn("yes", "learn:observer").action,
    "navigate-observer"
  );
});

test("Approved topic explanations are available", () => {
  assert.match(getVisitorTopicAnswer("eon"), /30 million EON/);
  assert.match(getVisitorTopicAnswer("observer"), /Observer cannot advance the clock/);
});

test("No and Home remain available", () => {
  assert.equal(planLearningTurn("no", "welcome").action, "decline");
  assert.equal(planLearningTurn("home", "welcome").action, "menu");
});
