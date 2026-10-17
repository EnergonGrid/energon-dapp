import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/qori/QoriNode.js",
  "utf8"
);

function getSection(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);

  assert.ok(a >= 0, `Missing: ${start}`);
  assert.ok(b > a, `Missing: ${end}`);

  return source.slice(a, b);
}

const visitor = getSection(
  "function handleVisitorMessage(cleanInput)",
  "function handleCoherentMessage(cleanInput)"
);

const guardian = getSection(
  "function handleCoherentMessage(cleanInput)",
  "async function refreshLiveState"
);

test("Visitor education precedes EMP observation and navigation", () => {
  const education = visitor.indexOf(
    'detectIntent(cleanInput) === "education"'
  );

  const observation = visitor.indexOf(
    "buildEmpDialogueResponse("
  );

  const navigation = visitor.indexOf(
    'q === "6" || q.includes("emp")'
  );

  assert.ok(
    education >= 0 &&
    education < observation &&
    education < navigation,
    "Visitor education must be handled before EMP observation and navigation"
  );

  assert.match(
    visitor.slice(education, observation),
    /getQoriResponse\(/
  );
});

test("Guardian education precedes EMP and generic status", () => {
  const education = guardian.indexOf(
    'detectIntent(cleanInput) === "education"'
  );

  const observation = guardian.indexOf(
    "buildEmpDialogueResponse("
  );

  const status = guardian.indexOf(
    'q.includes("status")'
  );

  assert.ok(
    education >= 0 &&
    education < observation &&
    education < status,
    "Guardian education must be handled before live observation"
  );

  assert.match(
    guardian.slice(education, observation),
    /getQoriResponse\(/
  );
});

test("Existing EMP observation and document handlers remain", () => {
  assert.match(visitor, /buildEmpDialogueResponse\(/);
  assert.match(visitor, /q\.includes\("emp"\)/);
  assert.match(guardian, /buildEmpDialogueResponse\(/);
  assert.match(guardian, /q\.includes\("status"\)/);
});
