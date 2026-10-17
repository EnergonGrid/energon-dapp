import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/qori/QoriNode.js",
  "utf8"
);

function section(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);

  assert.ok(a >= 0, `Missing section: ${start}`);
  assert.ok(b > a, `Missing section boundary: ${end}`);

  return source.slice(a, b);
}

test("QoriNode imports conversation context resolver", () => {
  assert.match(
    source,
    /import\s*\{[^}]*\badvanceConversationContext\b[^}]*\}\s*from\s*["']\.\/conversation\/conversationContext["']/
  );
});

test("Conversation context has its own session ref", () => {
  assert.match(
    source,
    /const conversationContextRef\s*=\s*useRef\(null\)/
  );
});

test("User submissions update conversation context", () => {
  const send = section(
    "function sendMessage()",
    "function openQoriNode()"
  );

  assert.match(
    send,
    /conversationContextRef\.current\s*=\s*advanceConversationContext\s*\(/
  );
});

test("Conversation tracking distinguishes Visitor and Guardian scopes", () => {
  const send = section(
    "function sendMessage()",
    "function openQoriNode()"
  );

  assert.match(send, /isVisitorFlow\s*\(/);
  assert.match(send, /walletAddress/);
  assert.match(send, /guardian:/);
});

test("Session reset clears conversation context", () => {
  const reset = section(
    "function resetConversation(",
    "function resetSilentTimer()"
  );

  assert.match(
    reset,
    /conversationContextRef\.current\s*=\s*null/
  );
});
