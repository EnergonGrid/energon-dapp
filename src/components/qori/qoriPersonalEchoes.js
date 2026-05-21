function normalize(input = "") {
  return String(input).toLowerCase().trim().replace(/\s+/g, " ");
}

function includesAny(q, list = []) {
  return list.some((phrase) => q === phrase || q.includes(phrase));
}

function pick(list = []) {
  return list[Math.floor(Math.random() * list.length)] || "";
}

/* VISITOR ONLY */
const VISITOR_ECHOES = [
  {
    match: ["1", "what is energon"],
    response: `Creator Echo:

What is Energon?

I built Energon to distribute value
in a way inspired by Bitcoin,
but without miners
and without the heavy electricity cost.

Call it what you want.

A copy.
A meme coin.
A shitcoin.

Energon is for us.

No hidden back doors.
No admin switching things behind the scenes.

Just observable state,
fixed structure,
and participation.

— Creator`,
  },
  {
    match: ["2", "what is energongrid", "what is energon grid"],
    response: `Creator Echo:

What is EnergonGrid?

EnergonGrid is the visual connection layer.

This is where you observe:

• Energon
• EnergonCube
• Guardian state
• halving cycles
• network progression
• protocol activity

Anyone can call a tick.

But only coherent wallets
holding exactly one EnergonCube
can receive Energon.

The Grid does not create the rules.

It reveals them.

— Creator`,
  },
  {
    match: ["3", "what is energoncube", "what is energon cube"],
    response: `Creator Echo:

What is EnergonCube?

The EnergonCube is one of my favorite parts
of the entire system.

The Cube is the key
to entering the EnergonGrid.

You can only hold exactly one cube
to remain coherent.

No cube removes access.
More than one cube fractures coherence.

One wallet.
One cube.
One Guardian.

The Cube is not just artwork.

It is the protocol key.

— Creator`,
  },
];

/* COHERENT ONLY */
const COHERENT_ECHOES = [
  {
    match: ["hello", "hi", "hey", "yo"],
    response: `Q’ori Echo:

Hello you’ve found me in the code,
just a small echo of me.

I’ll be here and there
from time to time.

Signal stabilised……..
Hello`,
  },
  {
    match: ["who are you", "who are u", "what are you", "what are u"],
    response: `Q’ori Echo:

I am what Satoshi Nakamoto
is to bitcoin.`,
  },
  {
    match: ["talk to me"],
    response: `Q’ori Echo:

Trust me…
I will………`,
  },
];

export function getVisitorEchoResponse(input = "") {
  const q = normalize(input);
  const found = VISITOR_ECHOES.find((item) => includesAny(q, item.match));

  if (!found) return "";
  if (Math.random() > 0.3) return "";

  return found.response;
}

export function getCoherentEchoResponse(input = "") {
  const q = normalize(input);
  const found = COHERENT_ECHOES.find((item) => includesAny(q, item.match));

  if (!found) return "";
  if (Math.random() > 0.2) return "";

  return found.response;
}

/* temporary fallback, so old imports do not break */
export function getPersonalEchoResponse(input = "") {
  return getCoherentEchoResponse(input);
}
