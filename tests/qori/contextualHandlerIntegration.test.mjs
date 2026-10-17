import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/qori/QoriNode.js",
  "utf8"
);

const start = source.indexOf("function sendMessage()");
const end = source.indexOf("function openQoriNode()", start);

assert.ok(start >= 0 && end > start);

const send = source.slice(start, end);

test("Contextual resolver is imported into QoriNode", () => {
  assert.match(
    source,
    /import\s*\{[^}]*resolveContextualQuery[^}]*\}\s*from\s*["']\.\/conversation\/conversationContext["']/
  );
});

test("Submitted questions are resolved after context tracking", () => {
  const advance = send.indexOf(
    "conversationContextRef.current = advanceConversationContext("
  );

  const resolve = send.indexOf(
    "const contextualQuery = resolveContextualQuery("
  );

  assert.ok(
    advance >= 0 && resolve > advance,
    "Resolve the question after updating conversation context"
  );

  assert.match(
    send,
    /resolveContextualQuery\(\s*clean,\s*conversationContextRef\.current\s*\)/
  );
});

test("Visitor and Guardian handlers receive contextual questions", () => {
  assert.match(
    send,
    /handleVisitorMessage\(contextualQuery\)/
  );

  assert.match(
    send,
    /handleCoherentMessage\(contextualQuery\)/
  );
});

test("Existing conversation safeguards remain", () => {
  assert.match(source, /function resetConversation\(/);
  assert.match(source, /conversationContextRef\.current\s*=\s*null/);
  assert.match(source, /buildEmpDialogueResponse\(/);
  assert.match(source, /getVisitorEchoResponse\(/);
  assert.match(source, /getCoherentEchoResponse\(/);
});
