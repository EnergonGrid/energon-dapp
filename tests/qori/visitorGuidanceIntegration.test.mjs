import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/qori/QoriNode.js", "utf8"
);

const visitor = source.split(
  "function handleVisitorMessage(cleanInput)"
)[1]?.split("function handleCoherentMessage")[0] || "";

test("Visitor boot opens the welcome invitation", () => {
  const boot = source.split("async function bootQori()")[1]
    ?.split("bootQori();")[0] || "";
  assert.match(boot, /scheduleSessionTimeout\(showVisitorWelcome, 900\)/);
});

test("Welcome establishes pending question", () => {
  assert.match(source, /visitorPendingRef\.current = "welcome"/);
});

test("Conversation reset clears pending question", () => {
  assert.match(source,
    /function resetConversation\(nextCtx = null\) \{\s*conversationContextRef\.current = null;\s*visitorPendingRef\.current = ""/);
});

test("Learning planner precedes ordinary routing", () => {
  assert.match(visitor, /planLearningTurn\(/);
  assert.ok(
    visitor.indexOf("planLearningTurn(") <
    visitor.indexOf("detectIntent(cleanInput)")
  );
  assert.match(visitor, /visitorPendingRef\.current = plan\.pending/);
});

test("Learning preserves knowledge and Creator Echoes", () => {
  assert.match(visitor, /getVisitorTopicAnswer\(plan\.topic\)/);
  assert.match(visitor, /getQoriResponse\(step\.query/);
  assert.match(visitor, /getVisitorEchoResponse\(step\.query\)/);
  assert.match(visitor, /step\.question/);
  assert.match(visitor, /answerLive\(VISITOR_DECLINE\)/);
});

test("Home and Guardian handling remain separate", () => {
  assert.match(visitor, /if \(plan\.action === "menu"\)/);
  assert.match(
    source,
    /function showVisitorMenu\(\) \{\s*visitorPendingRef\.current = ""/
  );
  assert.match(
    source,
    /else handleCoherentMessage\(contextualQuery\)/
  );
});

test("Visible Home button is Visitor-only", () => {
  assert.match(
    source,
    /\{isVisitorFlow\(\) && \(\s*<button[\s\S]*?onClick=\{showVisitorMenu\}[\s\S]*?>\s*Home\s*<\/button>/
  );
});

test("Input guidance appears below an empty input", () => {
  assert.match(source, /placeholder=""/);
  assert.match(source, /id="qori-input-hint"/);
  assert.match(source, /\{inputHint\}/);
  assert.match(source, /visitorPendingRef\.current[\s\S]*?You can answer yes, no/);
});

test("Home navigation clears the pending question", () => {
  assert.match(
    source,
    /function showVisitorMenu\(\) \{\s*visitorPendingRef\.current = ""/
  );
});
