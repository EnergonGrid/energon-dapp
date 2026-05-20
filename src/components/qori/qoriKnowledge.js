function normalize(input = "") {
  return String(input).toLowerCase().trim().replace(/\s+/g, " ");
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

function helpMenu() {
  return `${randomVisitorPrompt()}

1. What is Energon
2. What is EnergonGrid
3. What is an EnergonCube
4. Wallet Setup
5. Read Whitepaper
6. Read EMP
7. Open Mint Site

Ask directly.`;
}

const KNOWLEDGE = [
  {
    keys: ["1", "energon", "what is energon"],
    responses: [
      `ENERGON

Energon is a live deterministic protocol built on Flare.

No admins.
No hidden automation.
No off-chain control.

Maximum EON supply:
30,000,000.`,
    ],
  },

  {
    keys: ["2", "energongrid", "energon grid", "what is energongrid"],
    responses: [
      `ENERGON GRID

EnergonGrid is the live protocol environment.

It is where Guardian state,
Observer systems,
and protocol interaction exist.

The Grid reads state.
It does not negotiate.`,
    ],
  },

  {
    keys: [
      "3",
      "cube",
      "energoncube",
      "energon cube",
      "nft",
      "key",
    ],
    responses: [
      `ENERGONCUBE

The EnergonCube is the protocol key.

Maximum cube supply:
1,000,000.

0 cubes:
NO KEY

1 cube:
COHERENT

2 or more cubes:
FRACTURED

One wallet.
One cube.
One Guardian.`,
    ],
  },

  {
    keys: [
      "4",
      "wallet",
      "wallet setup",
      "bifrost",
      "metamask",
      "ledger",
    ],
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
    keys: ["5", "whitepaper", "read whitepaper", "white paper"],
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
    keys: ["6", "emp", "read emp"],
    responses: [
      `EMP

EMP expands the deeper protocol structure.

It is intended after the Whitepaper
for extended understanding.`,
    ],
  },

  {
    keys: ["7", "mint", "mint site", "dapp", "open mint"],
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
    responses: [helpMenu],
  },
];

export function getQoriResponse(input = "") {
  const q = normalize(input);

  if (!q) return helpMenu();

  for (const item of KNOWLEDGE) {
    const matched = item.exact
      ? item.keys.some((key) => q === key)
      : hasAny(q, item.keys);

    if (matched) {
      return pick(item.responses);
    }
  }

  return `Signal received.

Q.O.R.I does not yet have a clean answer for that.

${helpMenu()}`;
}