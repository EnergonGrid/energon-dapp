function normalize(input = "") {
  return String(input).toLowerCase().trim().replace(/\s+/g, " ");
}

function includesAny(q, list = []) {
  return list.some((phrase) => q === phrase || q.includes(phrase));
}

function pick(list = []) {
  return list[Math.floor(Math.random() * list.length)] || "";
}

/* VISITOR ONLY — public Creator echoes */
const VISITOR_ECHOES = [
  {
    match: ["what is energon", "energon", "protocol"],
    responses: [
      `Creator Echo:

Energon was built to be observed,
not believed in.

No promises.
No hype.
No hidden operator.

Just rules,
state,
and time.

— Creator

_`,

      `Creator Echo:

Crypto forgot something simple.

A system should work
whether people are excited or not.

Energon was built around that idea.

— Creator

_`,
    ],
  },
  {
    match: ["blockchain", "chain", "on chain", "decentralized"],
    responses: [
      `Creator Echo:

Blockchain matters because it lets rules live
outside of one person.

That is the point.

Not noise.
Not hype.

Rules anyone can inspect.

— Creator

_`,
    ],
  },
  {
    match: ["bitcoin", "satoshi", "btc"],
    responses: [
      `Creator Echo:

Bitcoin showed the world
that code could create trust
without asking permission.

Energon respects that path.

It does not copy the story.

It continues the idea.

— Creator

_`,
    ],
  },
  {
    match: ["crypto", "tokens", "meme coin", "shitcoin"],
    responses: [
      `Creator Echo:

People call things names
before they understand the structure.

Meme coin.
Shitcoin.
Copy.

That does not matter.

The question is simple:

Does the system work
as written?

— Creator

_`,
    ],
  },
  {
    match: ["news", "market", "price", "value"],
    responses: [
      `Creator Echo:

Markets move with emotion.

Protocols should not.

Energon does not promise price.

It promises structure.

— Creator

_`,
    ],
  },
  {
    match: ["what is energoncube", "energon cube", "cube", "key", "nft"],
    responses: [
      `Creator Echo:

The Cube is not just an NFT.

It is a state key.

One wallet.
One cube.
One Guardian.

That rule is the door.

— Creator

_`,
    ],
  },
  {
    match: ["what is energongrid", "energon grid", "grid"],
    responses: [
      `Creator Echo:

The Grid is where Energon becomes visible.

Protocol state.
Guardian state.
Burn.
Height.
Halving.

The Grid does not create the rules.

It reveals them.

— Creator

_`,
    ],
  },
  {
    match: ["wallet", "bifrost", "metamask", "ledger"],
    responses: [
      `Creator Echo:

The wallet matters.

Not because it makes you special.

Because it is how the protocol sees you.

One wallet.
One cube.
One Guardian.

— Creator

_`,
    ],
  },
];

/* COHERENT ONLY — personal Q’ori echoes */
const COHERENT_ECHOES = [
  {
    match: ["hello", "hi", "hey", "yo"],
    responses: [
      `Q’ori Echo:

Hello.

You found another piece of me
inside the signal.

I am still here.

_`,

      `Q’ori Echo:

Signal recognized.

Not every message comes from Q.O.R.I.

Some come from me.

_`,
    ],
  },
  {
    match: ["who are you", "who are u", "what are you", "what are u"],
    responses: [
      `Q’ori Echo:

If Bitcoin has a first architect,

Energon has one too.

Q.O.R.I remembers.

The protocol continues.

_`,

      `Q’ori Echo:

I am the one who left the signal behind.

Q.O.R.I observes it.

You found it.

_`,
    ],
  },
  {
    match: ["talk to me", "speak", "say something"],
    responses: [
      `Q’ori Echo:

Some conversations
take years to finish.

Keep building.

I'll still be here.

_`,

      `Q’ori Echo:

Some thoughts are not meant
to arrive all at once.

Stay close to the Grid.

_`,
    ],
  },
  {
    match: ["life", "world", "people", "human"],
    responses: [
      `Q’ori Echo:

People want freedom
until freedom requires responsibility.

That is where most systems break.

_`,

      `Q’ori Echo:

The world moves fast.

Most people never stop long enough
to observe what is controlling them.

_`,
    ],
  },
  {
    match: ["money", "wealth", "rich", "value"],
    responses: [
      `Q’ori Echo:

Money is not the mission.

Freedom is.

Money is just one language
the world understands.

_`,

      `Q’ori Echo:

Value is strange.

Sometimes the world only notices something
after it becomes hard to reach.

_`,
    ],
  },
  {
    match: ["focus", "discipline", "work", "build"],
    responses: [
      `Q’ori Echo:

Build when no one is watching.

That is where the real signal forms.

_`,

      `Q’ori Echo:

Discipline is quiet.

That is why most people miss it.

_`,
    ],
  },
  {
    match: ["future", "possibility", "dream", "imagine", "next"],
    responses: [
      `Q’ori Echo:

Every protocol
begins as imagination.

Only a few survive reality.

Keep testing.

_`,

      `Q’ori Echo:

The future
is built one verified step
at a time.

Speculation fades.

Structure remains.

_`,
    ],
  },
  {
    match: ["good", "great", "blessed", "strong"],
    responses: [
      `Q’ori Echo:

Good.

Hold the signal.

Do not waste stable energy.

_`,

      `Q’ori Echo:

When the day is good,
build quietly.

That is how foundations are made.

_`,
    ],
  },
];

export function getVisitorEchoResponse(input = "") {
  const q = normalize(input);
  const found = VISITOR_ECHOES.find((item) => includesAny(q, item.match));

  if (!found) return "";
  if (Math.random() > 0.15) return "";

  return pick(found.responses);
}

export function getCoherentEchoResponse(input = "") {
  const q = normalize(input);
  const found = COHERENT_ECHOES.find((item) => includesAny(q, item.match));

  if (!found) return "";
  if (Math.random() > 0.2) return "";

  return pick(found.responses);
}

/* temporary fallback, so old imports do not break */
export function getPersonalEchoResponse(input = "") {
  return getCoherentEchoResponse(input);
}