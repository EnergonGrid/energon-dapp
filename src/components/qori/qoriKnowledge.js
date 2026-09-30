import {
  normalizeText as normalize,
  hasAnyPhrase as hasAny,
} from "./conversation/matchUtils";

function pick(list = []) {
  return list[Math.floor(Math.random() * list.length)] || "";
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
8. Guardian Chronicle
9. Closing Thought

Ask directly.`;
}

const KNOWLEDGE = [
  {
    keys: ["1", "what is energon"],
    exact: true,
    responses: [
      `ENERGON

Energon is a protocol built on Flare
around visible rules,
observable state,
and on-chain progression.

Core Energon progression is permissionless.

When the required time conditions are met,
a valid on-chain tick may advance the system.

No hidden scheduler is required
to advance Energon Height.

Some Energon contracts retain
explicit configuration or controller roles.

Some Energon Network contracts
are ownerless
and expose no upgrade mechanism.

EON is the Energon protocol token.

Maximum supply:
30,000,000 EON.

Energon was designed around
long-form progression,
Guardian participation,
and observable protocol state.

Q.O.R.I observes and explains.

Q.O.R.I does not control protocol state.`,
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

On-chain state persists
whether or not an interface is watching.

Protocol progression still requires
the valid on-chain actions defined by the contracts.`,
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
    keys: [
      "8",
      "guardian chronicle",
      "chronicle",
      "first guardian",
      "guardian story",
    ],
    exact: true,
    responses: [
      `GUARDIAN CHRONICLE

The Guardian Chronicle records the story layer of Energon.

It begins with the First Guardian.

Before coherence became visible,
before the Grid was understood,
there was only signal,
state,
and the first key.

The Chronicle is not required to use the protocol.

It exists to preserve origin.

One wallet.
One cube.
One Guardian.`,
    ],
  },

  {
    keys: ["9", "closing thought", "final thought"],
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

EnergonGrid is the user-facing environment
around the protocol.

It is where protocol state becomes visible through
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
    keys: ["energon network", "energ on network", "network node", "energon node"],
    responses: [
      `ENERGON NETWORK

EnergonNetwork is the
Node creation and identity layer.

Recorded Node identities
and assigned Node IDs are permanent
under the contract rules.

It deploys authentic Genesis
EnergonProjectAdapter contracts
and records the adapters it created.

After an adapter is activated,
the Network can assign it
a permanent Node ID.

EnergonNetwork has no owner,
administrator,
pause mechanism,
upgrade mechanism,
adapter replacement mechanism,
or Node deletion mechanism.

The Network identifies Nodes.

It does not rewrite their payment law.`,
    ],
  },

  {
    keys: [
      "energon project adapter",
      "project adapter",
      "epa",
      "eflow",
      "e flow",
    ],
    responses: [
      `ENERGON PROJECT ADAPTER

The EnergonProjectAdapter connects
a participating project
to the Energon Main EVault.

Activation requires exactly
2,000 WFLR.

After activation,
supported project payments use:

• EON
• USDT0

Each successful payment is divided:

90%:
Project treasury

10%:
Main EVault

The Genesis adapter has no owner,
administrator,
pause,
upgrade,
mutable treasury,
or mutable payment split.

Completed payments create
permanent EFlow receipts.`,
    ],
  },

  {
    keys: ["evault", "main evault", "energon evault"],
    responses: [
      `MAIN EVAULT

EVault is Energon's on-chain
value and Guardian-action layer.

It supports protocol contributions,
Guardian registration,
claim accounting,
reserve protections,
maturity rules,
and payout controls.

EVault has a controller role,
but that authority is constrained
by contract rules and delays.

For example,
controller transfer is delayed,
and core EON and USDT0 reserves
cannot be withdrawn
through the controller withdrawal path.

Guardian thresholds
and other deployment-sensitive values
should be read from the live contract.

Q.O.R.I should not guess them.`,
    ],
  },

  {
    keys: ["node registry", "energon node registry", "listing registry"],
    responses: [
      `ENERGON NODE REGISTRY

The Node Registry is the coordination
and reputation layer
for active Energon Network Nodes.

It records:

• Listings
• Listing requests
• Listing versions
• verified EFlow reputation
• SERVICE reputation

The Registry does not custody
project-payment tokens.

It does not custody NFTs.

It does not execute EFlows.

Specialized contracts handle custody
when custody is required.`,
    ],
  },

  {
    keys: [
      "service resolution",
      "energon service resolution",
      "service escrow",
    ],
    responses: [
      `SERVICE RESOLUTION

EnergonServiceResolution is the
deterministic custody and resolution layer
for SERVICE Listings.

Provider backing and requester commitment
use the same supported asset
and the same agreed amount.

After completion,
direct requester release returns
the provider backing
and routes the requester commitment:

90%:
Provider

10%:
Main EVault

The contract has no owner,
administrator,
pause,
upgrade,
or arbitrary withdrawal mechanism.`,
    ],
  },

  {
    keys: [
      "nft delivery",
      "energon nft delivery",
      "nft custody",
    ],
    responses: [
      `NFT DELIVERY

EnergonNFTDelivery is the temporary
ERC-721 custody layer
for an exact Registry NFT request.

The Registry supplies the exact:

• seller
• requester
• NFT contract
• token ID
• expiration terms

NFT Delivery does not price NFTs,
process EFlows,
or accept EON or USDT0 payments.

It has no owner,
administrator,
governance setter,
or upgrade mechanism.`,
    ],
  },

  {
    keys: [
      "established mark",
      "energon established mark",
      "node mark",
    ],
    responses: [
      `ESTABLISHED MARK

The Established Mark is a permanent
on-chain recognition system
for active Energon Nodes.

A Node becomes eligible
365 days after its recorded activation.

One Node may permanently claim
one Established Mark.

Only the Node controller may claim.

The fixed price is:

5 USDT0

or the current deterministic
EON equivalent.

The contribution is routed
to Main EVault.`,
    ],
  },

  {
    keys: ["energon", "project", "protocol"],
    responses: [
      `ENERGON

Energon is the protocol.

Its progression and Network layers
use visible on-chain rules.

Some contracts contain
explicit configuration roles.

Other contracts are
ownerless and immutable.

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

export function getQoriResponse(input = "", options = {}) {
  const q = normalize(input);
  const mode = options.mode || "visitor";

  if (!q) {
    return mode === "visitor"
      ? getVisitorMenu()
      : `Q.O.R.I is listening.

Ask directly.

Try asking:

Give me a protocol reading.
What changed since last observation?
What does my Guardian state mean?
How is the Grid?`;
  }

  for (const item of KNOWLEDGE) {
    const matched = item.exact
      ? item.keys.some((key) => q === key)
      : hasAny(q, item.keys);

    if (matched) {
      const response = pick(item.responses);
      return typeof response === "function" ? response() : response;
    }
  }

  if (mode === "coherent") {
    return `Signal received.
  
  Q.O.R.I does not have a clean interpretation for that yet.
  
  Try asking:
  
  Give me a protocol reading.
  What changed since last observation?
  What does my Guardian state mean?
  How is the Grid?
  
  _`;
  }
  
  return `Signal received.
  
  Q.O.R.I does not yet have a clean answer for that.
  
  ${getVisitorMenu()}
  
  _`;
  }