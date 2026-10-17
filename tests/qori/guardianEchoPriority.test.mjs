import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const node = fs.readFileSync(
  "src/components/qori/QoriNode.js",
  "utf8"
);

const echoes = fs.readFileSync(
  "src/components/qori/qoriCoherentEchoes.js",
  "utf8"
);

const start = node.indexOf(
  "function handleCoherentMessage(cleanInput)"
);

const end = node.indexOf(
  "async function refreshLiveState",
  start
);

assert.ok(start >= 0 && end > start);

const guardian = node.slice(start, end);

test("Guardian vocabulary takes priority over Echo fallback", () => {
  const vocabulary = guardian.indexOf("if (vocabulary)");
  const echo = guardian.indexOf("if (coherentEcho)");

  assert.ok(
    vocabulary >= 0 && echo > vocabulary,
    "Knowledge must be handled before standalone Echo responses"
  );
});

test("Guardian knowledge can include an Echo without replacement", () => {
  const vocabulary = guardian.indexOf("if (vocabulary)");
  const echo = guardian.indexOf("if (coherentEcho)");

  assert.ok(vocabulary >= 0);

  const knowledgeBranch = guardian.slice(
    vocabulary,
    echo > vocabulary ? echo : guardian.length
  );

  assert.match(knowledgeBranch, /\$\{vocabulary\}/);
  assert.match(knowledgeBranch, /\$\{coherentEcho\}/);
});

test("Guardian Echo fallback remains available", () => {
  assert.match(guardian, /if\s*\(coherentEcho\)/);
});

test("Original 20 percent Echo probability is preserved", () => {
  assert.match(
    echoes,
    /Math\.random\(\)\s*>\s*0\.20/
  );
});
