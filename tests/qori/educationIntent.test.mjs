import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Load the existing router without modifying production imports.
const routerPath = path.resolve(
  "src/components/qori/conversation/intentRouter.js"
);

const utilsUrl = pathToFileURL(
  path.resolve("src/components/qori/conversation/matchUtils.js")
).href;

const source = fs.readFileSync(routerPath, "utf8");
const dependency = 'from "./matchUtils"';

assert.equal(
  source.split(dependency).length - 1,
  1,
  "Expected one matchUtils import"
);

const loadableSource = source.replace(
  dependency,
  `from "${utilsUrl}"`
);

const { detectIntent } = await import(
  `data:text/javascript;base64,${Buffer.from(loadableSource).toString("base64")}`
);

const cases = [
  ["What is EMP?", "education"],
  ["How does EMP work?", "education"],
  ["What is EVault?", "education"],
  ["Why does EVault require reserves?", "education"],
  ["What is Energon Network?", "education"],

  ["What is my EMP status?", "observe"],
  ["Are EMP reserves healthy?", "observe"],
  ["Read EMP", "navigation"],
  ["How is the Grid?", "observe"],
];

for (const [question, expected] of cases) {
  test(`${question} routes to ${expected}`, () => {
    assert.equal(
      detectIntent(question),
      expected
    );
  });
}
