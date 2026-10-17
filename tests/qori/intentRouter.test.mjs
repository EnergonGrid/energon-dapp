import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const base = "src/components/qori/conversation/";

function dataUrl(source) {
  return "data:text/javascript;base64," +
    Buffer.from(source).toString("base64");
}

const matchSource = fs.readFileSync(
  base + "matchUtils.js",
  "utf8"
);

const matchUrl = dataUrl(matchSource);

const originalRouter = fs.readFileSync(
  base + "intentRouter.js",
  "utf8"
);

const routerSource = originalRouter.replace(
  'from "./matchUtils";',
  `from "${matchUrl}";`
);

assert.notEqual(
  routerSource,
  originalRouter,
  "Intent router import must be resolved"
);

const { detectIntent } = await import(
  dataUrl(routerSource)
);

test("Read EMP routes to document navigation", () => {
  assert.equal(
    detectIntent("Read EMP"),
    "navigation"
  );
});

test("EMP operational questions are not Community", () => {
  assert.notEqual(
    detectIntent("How is the EMP?"),
    "community"
  );
});

test("Core Grid status retains observation intent", () => {
  assert.equal(
    detectIntent("How is the Grid?"),
    "observe"
  );
});

test("General conversation remains available", () => {
  assert.equal(
    detectIntent("Hello Q.O.R.I."),
    "conversation"
  );
});
