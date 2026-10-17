import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const cases = [
  ["Why should I join the Energon community?", "When someone becomes a Guardian"],
  ["What does the Energon community stand for?", "When someone becomes a Guardian"],
  ["How can I join the community?", "When someone becomes a Guardian"],
  ["What do you think about new Guardians joining?", "When someone becomes a Guardian"],
  ["Why did you build Energon?", "When I started thinking about Energon"],
  ["Why did you create Energon?", "When I started thinking about Energon"],
  ["Why was Energon created?", "When I started thinking about Energon"],
  ["Why is there only one Guardian cube?", "When I designed the Guardian system"],
  ["What does being a Guardian mean?", "When I designed the Guardian system"],
  ["Why does having two cubes break coherence?", "When I designed the Guardian system"],
  ["What is Energon Guardian state?", "When I designed the Guardian system"],
  ["What does an EnergonCube do?", "When I created EnergonCube"],
  ["How did Bitcoin inspire Energon?", "Bitcoin made me look at money"],
  ["What is EMP?", "When I put EMP together"],
  ["How does EMP work?", "When I started building Energon"],
  ["How do I set up a wallet as a Guardian?", "The wallet is where entry begins"],
  ["How does Bitcoin influence Guardian identity?", "Bitcoin made me look at money"]
];

const runner = String.raw`
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

let chance = 0;
const math = Object.create(Math);
math.random = () => chance;
const context = vm.createContext({ Math: math });
const cache = new Map();

function load(file) {
  const name = path.resolve(file);
  if (!cache.has(name)) {
    cache.set(name, new vm.SourceTextModule(
      fs.readFileSync(name, "utf8"),
      { context, identifier: name }
    ));
  }
  return cache.get(name);
}

const root = load("src/components/qori/qoriVisitorEchoes.js");

await root.link((spec, parent) => {
  if (!spec.startsWith(".")) throw Error("Unexpected import");
  let file = path.resolve(path.dirname(parent.identifier), spec);
  if (!path.extname(file)) file += ".js";
  return load(file);
});

await root.evaluate();

const echo = root.namespace.getVisitorEchoResponse;
const questions = JSON.parse(process.argv[1]);
const replies = questions.map(question => echo(question));

chance = 0.36;
const suppressed = echo("What is EMP?");
chance = 0;
const unrelated = echo("unrelated question");

console.log(JSON.stringify({ replies, suppressed, unrelated }));
`;

const output = execFileSync(
  process.execPath,
  [
    "--no-warnings",
    "--experimental-vm-modules",
    "--input-type=module",
    "-e",
    runner,
    JSON.stringify(cases.map(item => item[0]))
  ],
  { encoding: "utf8" }
);

const results = JSON.parse(output);

for (const [i, [question, expected]] of cases.entries()) {
  test(`Creator Echo: ${question}`, () => {
    assert.ok(results.replies[i].includes(expected), question);
  });
}

test("Creator Echo respects 35 percent threshold", () => {
  assert.equal(results.suppressed, "");
});

test("Unrelated questions do not trigger Creator Echo", () => {
  assert.equal(results.unrelated, "");
});
