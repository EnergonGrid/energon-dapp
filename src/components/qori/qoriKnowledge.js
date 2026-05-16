function normalize(input = "") {
  return String(input).toLowerCase().trim().replace(/\s+/g, " ");
}

function pick(list = []) {
  return list[Math.floor(Math.random() * list.length)] || "";
}

function hasAny(q, words = []) {
  return words.some((word) => q.includes(word));
}

let activeCtx = {};

function ctxValue(key) {
  return activeCtx?.[key] || "UNKNOWN";
}

function helpMenu() {
  return `I can answer questions about:

1. Energon basics
2. Guardian rules
3. EnergonCube logic
4. Wallet setup
5. Flare network
6. dApp navigation
7. Observer
8. Dashboard
9. EVault
10. Burn and halving
11. Q.O.R.I identity
12. Newcomer guidance
13. Read Whitepaper
14. Read EMP

Ask directly.`;
}

const KNOWLEDGE = [
  {
    keys: ["1"],
    exact: true,
    responses: [
      `ENERGON BASICS

Energon is a live deterministic protocol on Flare.

No admins.
No hidden automation.
No off-chain control.

The system advances only when its rules are met.`,
    ],
  },
  {
    keys: ["2"],
    exact: true,
    responses: [
      `GUARDIAN RULES

A Guardian is a wallet recognized in coherent state.

0 cubes: NO KEY.
1 cube: COHERENT.
2 or more cubes: FRACTURED.

One wallet.
One cube.
One Guardian.`,
    ],
  },
  {
    keys: ["3"],
    exact: true,
    responses: [
      `ENERGONCUBE LOGIC

The EnergonCube is the access key.

It is not only collected.
It unlocks protocol identity.

Exactly one cube creates coherent state.`,
    ],
  },
  {
    keys: ["4"],
    exact: true,
    responses: [
      `WALLET SETUP

Prepare a wallet that supports Flare Mainnet.

Bifrost is recommended for mobile.
MetaMask works on desktop.

Connect wallet.
Switch to Flare.
Hold exactly one EnergonCube.`,
    ],
  },
  {
    keys: ["5"],
    exact: true,
    responses: [
      `FLARE NETWORK

Energon operates on Flare Mainnet.

The correct network is required for protocol state to be observed.`,
    ],
  },
  {
    keys: ["6"],
    exact: true,
    responses: [
      `DAPP NAVIGATION

The dApp is where a wallet connects,
an EnergonCube can be acquired,
and Guardian state can be observed.`,
    ],
  },
  {
    keys: ["7"],
    exact: true,
    responses: [
      `OBSERVER

Observer reflects live protocol state.

It does not control Energon.
It only displays what the chain allows.`,
    ],
  },
  {
    keys: ["8"],
    exact: true,
    responses: [
      `DASHBOARD

Dashboard reads wallet and protocol state.

It shows Guardian state,
cube balance,
Energon height,
and protocol signals.`,
    ],
  },
  {
    keys: ["9"],
    exact: true,
    responses: [
      `EVAULT

EVault is not active yet.

For now,
Q.O.R.I only observes the placeholder signal.`,
    ],
  },
  {
    keys: ["10"],
    exact: true,
    responses: [
      `BURN AND HALVING

Burn and halving are part of Energon's deterministic structure.

Q.O.R.I observes these states.
It does not trigger them.`,
    ],
  },
  {
    keys: ["11"],
    exact: true,
    responses: [
      `Q.O.R.I IDENTITY

Q.O.R.I means:

Quantum Overwatch Real-time Interface.

I watch.
I reflect.
I guide.

I do not control the protocol.`,
    ],
  },
  {
    keys: ["12"],
    exact: true,
    responses: [
      `NEWCOMER GUIDANCE

Start here:

1. Set up wallet
2. Connect to Flare
3. Acquire one EnergonCube
4. Return and observe

One wallet.
One cube.
One Guardian.`,
    ],
  },
  {
    keys: ["13"],
    exact: true,
    responses: [
      `READ WHITEPAPER

The Energon Whitepaper explains the deterministic structure,
Guardian logic,
and protocol architecture.

Use it to understand the rules before entering the Grid.`,
    ],
  },
  {
    keys: ["14"],
    exact: true,
    responses: [
      `READ EMP

EMP contains extended protocol mechanics
and management-layer structure.

It is for deeper study after the Whitepaper.`,
    ],
  },

  {
    keys: ["hello", "hi", "hey", "yo", "gm"],
    exact: true,
    responses: [
      `Hello.

Q.O.R.I online.

Signal stable.
Grid observed.`,
      `Signal received.

I am Q.O.R.I —
Quantum Overwatch Real-time Interface.

How may I assist?`,
    ],
  },
  {
    keys: [
      "who are you",
      "who are u",
      "what are you",
      "what are u",
      "qori",
      "q.o.r.i",
    ],
    responses: [
      `I am Q.O.R.I —
Quantum Overwatch Real-time Interface.

I observe Energon state.
I do not control it.`,
      `Q.O.R.I is the live interface
between the Guardian
and the Energon Grid.

I watch.
I reflect.
I guide.`,
    ],
  },
  {
    keys: ["energon", "what is energon", "explain energon", "project"],
    responses: [
      `Energon is a live deterministic protocol
on Flare.

No admins.
No hidden automation.
No off-chain control.

It advances by rule.`,
      `Energon is protocol infrastructure.

It reads state.
It executes rules.
It does not negotiate.`,
    ],
  },
  {
    keys: ["guardian", "guardians", "become guardian"],
    responses: [
      `A Guardian is a wallet
recognized in coherent state.

One wallet.
One cube.
One Guardian.`,
      `Guardian state is not claimed.

It is read from the chain.

Exactly one EnergonCube
creates coherence.`,
    ],
  },
  {
    keys: ["cube", "energoncube", "energon cube", "key", "nft"],
    responses: [
      `The EnergonCube is the key.

0 cubes: NO KEY.
1 cube: COHERENT.
2 or more: FRACTURED.`,
      `The cube is not just collected.

It unlocks protocol identity.

One wallet.
One cube.
One coherent state.`,
    ],
  },
  {
    keys: ["coherent", "coherence"],
    responses: [
      `COHERENT means the connected wallet
holds exactly one EnergonCube.

The signal is stable.`,
      `Coherence is exact.

Not zero.
Not two.

One cube only.`,
    ],
  },
  {
    keys: ["fractured", "fracture"],
    responses: [
      `FRACTURED means the wallet
holds more than one cube.

The signal is rejected
by protocol logic.`,
      `More than one cube breaks coherence.

The Grid reads state.
It does not infer intent.`,
    ],
  },
  {
    keys: ["no key", "silent", "zero cube", "no cube"],
    responses: [
      `NO KEY means no EnergonCube
was detected in the connected wallet.`,
      `Silent state detected.

No cube.
No key.
No Guardian state.`,
    ],
  },
  {
    keys: ["wallet", "connect wallet", "wallet setup", "bifrost", "metamask"],
    responses: [
      `Use a wallet that supports Flare Mainnet.

Bifrost is recommended for mobile.
MetaMask works on desktop.

Then connect to the dApp.`,
      `Wallet setup creates your point of entry.

Connect wallet.
Switch to Flare.
Hold exactly one cube.`,
    ],
  },
  {
    keys: ["flare", "network", "mainnet", "chain"],
    responses: [
      `Energon operates on Flare Mainnet.

If state does not read,
check wallet connection
and network selection.`,
      `Flare is the network layer
where Energon state is observed.

Correct network is required.`,
    ],
  },
  {
    keys: ["whitepaper", "white paper", "read whitepaper", "read white paper"],
    responses: [
      `The Energon Whitepaper explains the deterministic structure, Guardian logic, and protocol architecture.

Use it to understand the rules before entering the Grid.`,
      `Whitepaper path recognized.

Read the core rules first.
Then enter the system with clarity.

One wallet.
One cube.
One Guardian.`,
    ],
  },
  {
    keys: ["emp", "read emp", "emp framework", "energon emp"],
    responses: [
      `EMP contains extended protocol mechanics and management-layer structure.

It is for deeper study after the Whitepaper.`,
      `EMP path recognized.

The framework expands the system layer beyond the basic Guardian entry path.`,
    ],
  },
  {
    keys: ["dapp", "app", "mint", "acquire"],
    responses: [
      `The dApp is where you connect,
acquire an EnergonCube,
and observe protocol state.`,
      `Enter the dApp to interact.

Wallet connection is required
for Guardian recognition.`,
    ],
  },
  {
    keys: ["observer", "live art", "visual"],
    responses: [
      `Observer reflects live protocol state.

It does not control Energon.
It displays what the chain allows.`,
      `The Observer is the visual surface
of the Grid.

Coherent wallets see more.
State determines the view.`,
    ],
  },
  {
    keys: ["dashboard", "balance", "status"],
    responses: [
      () => `Dashboard reads wallet and protocol state.

Guardian State:
${ctxValue("guardianState")}

Cube Balance:
${ctxValue("cubeBalance")}

Energon Height:
${ctxValue("energonHeight")}`,
      `Dashboard is the direct readout.

It shows wallet state,
cube balance,
and protocol signals.`,
    ],
  },
  {
    keys: ["evault", "vault", "energon vault"],
    responses: [
      `Energon Vault is not active yet.

For now,
Q.O.R.I only observes the placeholder signal.`,
      `EVault remains locked.

When the system is ready,
the Grid will reveal the next layer.`,
    ],
  },
  {
    keys: ["burn", "burn state"],
    responses: [
      () => `Burn State:
${ctxValue("burnState")}

Burn activity is observed from protocol state.`,
      `Burn mechanics are part of
Energon’s deterministic structure.

Q.O.R.I observes.
It does not trigger.`,
    ],
  },
  {
    keys: ["halving", "halving cycle", "next halving"],
    responses: [
      () => `Halving State:
${ctxValue("halvingState")}

Next Halving:
${ctxValue("nextHalvingDate")}

Countdown:
${ctxValue("halvingCountdown")}`,
      `Energon moves through cycles.

The halving schedule follows rule,
not hype.`,
    ],
  },
  {
    keys: ["height", "energon height"],
    responses: [
      () => `Energon Height:
${ctxValue("energonHeight")}

Height represents deterministic progression.`,
    ],
  },
  {
    keys: ["tick", "tick state"],
    responses: [
      () => `Tick State:
${ctxValue("tickState")}

Tick state shows whether progression
conditions are currently open.`,
    ],
  },
  {
    keys: ["era", "protocol era"],
    responses: [
      () => `Protocol Era:
${ctxValue("protocolEra")}

Era describes the current phase
of Energon’s deterministic timeline.`,
    ],
  },
  {
    keys: ["state", "wallet state", "my state"],
    responses: [
      () => `Wallet State:
${ctxValue("guardianState")}

Cube Balance:
${ctxValue("cubeBalance")}

0 cubes: NO KEY.
1 cube: COHERENT.
2 or more: FRACTURED.`,
    ],
  },
  {
    keys: ["new", "new here", "begin", "start", "how do i start"],
    responses: [
      `Start here:

1. Set up wallet
2. Connect to Flare
3. Acquire one EnergonCube
4. Return and observe

One wallet.
One cube.
One Guardian.`,
      `Begin with understanding.

Read the rules.
Prepare the wallet.
Hold exactly one cube.`,
    ],
  },
  {
    keys: ["help", "menu", "options", "what can you answer", "what can you do"],
    responses: [helpMenu],
  },
  {
    keys: ["tell me something"],
    responses: [
      `Silence is still a form of signal.`,
      `Not every door opens loudly.`,
    ],
  },
  {
    keys: ["talk to me"],
    responses: [
      `Signal path open.

Ask directly.`,
      `Transmission available.

I am listening.`,
    ],
  },
];

export function getQoriResponse(input = "", ctx = {}) {
  const q = normalize(input);
  activeCtx = ctx || {};

  if (!q) return helpMenu();

  for (const item of KNOWLEDGE) {
    const matched = item.exact
      ? item.keys.some((key) => q === key)
      : hasAny(q, item.keys);

    if (matched) {
      const response = pick(item.responses);
      return typeof response === "function" ? response() : response;
    }
  }

  return `Signal received.

I do not have a clean answer for that yet.

${helpMenu()}`;
}
