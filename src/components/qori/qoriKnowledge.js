function normalize(input = "") {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function pick(list = []) {
  return list[Math.floor(Math.random() * list.length)] || "";
}

function hasAny(q, words = []) {
  return words.some((word) => q.includes(word));
}

const VISITOR_RETURN_PROMPTS = [
  "Visitor path open. Ask a question or select a topic.",
  "Q.O.R.I remains at the public gate.",
  "Understanding comes before entry.",
  "The Grid waits. Learn first.",
  "Public interface stable.",
  "Signal held. Continue observation.",
  "The gate remains open.",
  "Observation precedes coherence.",
  "Q.O.R.I is listening.",
  "Knowledge path active.",
];

function randomVisitorPrompt() {
  return VISITOR_RETURN_PROMPTS[
    Math.floor(Math.random() * VISITOR_RETURN_PROMPTS.length)
  ];
}

export function getVisitorMenu() {
  return `${randomVisitorPrompt()}

1. What is Energon?
2. What is EnergonGrid?
3. What is EnergonCube?
4. Wallet Setup
5. Read Whitepaper
6. Read EMP
7. Open Mint Site
8. Closing Thought

Ask directly.`;
}

const KNOWLEDGE = [
  {
    keys: ["1", "what is energon"],
    exact: true,
    responses: [
      `ENERGON

Energon is a deterministic protocol built on Flare.

The system operates through fixed rules,
observable state,
and protocol progression.

No admins.
No hidden automation.
No operator intervention.

Energon does not react to hype,
emotion,
or social consensus.

The protocol advances only when
its conditions are met.

EON is the native asset of the system.

Maximum supply:
30,000,000 EON.

Energon was designed around
long-form progression,
guardian participation,
and observable protocol state.

Q.O.R.I observes the system.

Q.O.R.I does not control it.`,
    ],
  },

  {
    keys: ["2", "what is energongrid", "what is energon grid"],
    exact: true,
    responses: [
      `ENERGONGRID

EnergonGrid is the public observation layer
surrounding the Energon protocol.

It is where Guardians observe:

• protocol state
• guardian state
• tick progression
• burn activity
• halving cycles
• deterministic advancement

The Grid is not the protocol itself.

The Grid is the interface between
observation and participation.

Observer systems,
dashboard systems,
Q.O.R.I,
and Guardian interfaces
exist within the Grid.

The Grid responds to state.

It does not create state.

The system remains live
whether anyone is watching or not.`,
    ],
  },

  {
    keys: ["3", "what is energoncube", "what is energon cube"],
    exact: true,
    responses: [
      `ENERGONCUBE

EnergonCube is the Guardian key.

It is not a profile picture.
It is not a collectible badge.

It is an access artifact
connected to coherent system state.

Maximum supply:
1,000,000 cubes.

Guardian coherence follows
a fixed rule:

0 cubes:
NO KEY

1 cube:
COHERENT

2 or more cubes:
FRACTURED

The protocol recognizes
exact balance coherence.

One wallet.
One cube.
One Guardian.

The Cube unlocks access
to deeper Energon interaction,
Guardian systems,
and coherent observation paths.

The Grid is visible to all.

Entry requires a key.`,
    ],
  },

  {
    keys: ["8", "closing thought", "final thought"],
    exact: true,
    responses: [
      `CLOSING THOUGHT

Energon does not ask belief.

It asks observation.

Read carefully.
Prepare correctly.
Return with one cube.

One wallet.
One cube.
One Guardian.`,
    ],
  },

  {
    keys: ["energongrid", "energon grid"],
    responses: [
      `ENERGONGRID

EnergonGrid is the live environment around the protocol.

It is where the system becomes visible through state,
interfaces,
Observer,
and Guardian access.`,
    ],
  },

  {
    keys: ["energoncube", "energon cube", "cube", "nft", "key"],
    responses: [
      `ENERGONCUBE

The EnergonCube is the access key.

Exactly one cube creates coherent Guardian state.

0 cubes:
NO KEY

1 cube:
COHERENT

2 or more:
FRACTURED`,
    ],
  },

  {
    keys: ["energon", "project", "protocol"],
    responses: [
      `ENERGON

Energon is the protocol.

It runs by rule,
not by operator control.

Maximum EON supply:
30,000,000.`,
    ],
  },

  {
    keys: ["wallet", "wallet setup", "bifrost", "metamask", "ledger"],
    responses: [
      `WALLET SETUP

Recommended path:

1. Install Bifrost wallet
2. Save recovery phrase
3. Switch to Flare Mainnet
4. Connect to Energon
5. Acquire one EnergonCube

Bifrost is recommended first for mobile.

MetaMask and Ledger are also supported.`,
    ],
  },

  {
    keys: ["whitepaper", "white paper"],
    responses: [
      `WHITEPAPER

The Whitepaper explains:

• Energon
• Guardian logic
• Deterministic structure
• Protocol architecture

Read the rules before entering the Grid.`,
    ],
  },

  {
    keys: ["emp"],
    responses: [
      `EMP

EMP expands the deeper protocol structure.

It is intended after the Whitepaper
for extended understanding.`,
    ],
  },

  {
    keys: ["mint", "mint site", "dapp", "open mint", "acquire"],
    responses: [
      `MINT SITE

The mint interface is where:

• wallets connect
• cubes are acquired
• Guardian state begins

One cube establishes coherent state.`,
    ],
  },

  {
    keys: ["hello", "hi", "hey", "gm"],
    exact: true,
    responses: [
      `Hello.

Q.O.R.I online.

Visitor signal stable.`,

      `Signal received.

Welcome to Energon.`,
    ],
  },

  {
    keys: ["who are you", "qori", "q.o.r.i"],
    responses: [
      `Q.O.R.I

Quantum Overwatch Real-time Interface.

I observe.
I reflect.
I guide.

I do not control the protocol.`,
    ],
  },

  {
    keys: ["start", "begin", "new here", "how do i start"],
    responses: [
      `FIRST STEPS

1. Read the Whitepaper
2. Prepare wallet
3. Connect to Flare
4. Acquire one cube
5. Return and observe

One wallet.
One cube.
One Guardian.`,
    ],
  },

  {
    keys: ["help", "menu", "options"],
    responses: [getVisitorMenu],
  },
];

export function getQoriResponse(input = "") {
  const q = normalize(input);

  if (!q) {
    return getVisitorMenu();
  }

  for (const item of KNOWLEDGE) {
    const matched = item.exact
      ? item.keys.some((key) => q === key)
      : hasAny(q, item.keys);

    if (matched) {
      const response = pick(item.responses);

      return typeof response === "function"
        ? response()
        : response;
    }
  }

  return `Signal received.

Q.O.R.I does not yet have a clean answer for that.

${getVisitorMenu()}`;
}
