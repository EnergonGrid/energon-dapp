function normalize(input = "") {
    return String(input).toLowerCase().trim().replace(/\s+/g, " ");
  }
  
  function includesAny(q, list = []) {
    return list.some((phrase) => q === phrase || q.includes(phrase));
  }
  
  function pick(list = []) {
    return list[Math.floor(Math.random() * list.length)] || "";
  }
  
  const VISITOR_ECHOES = [
    {
      match: ["what is energon", "energon", "protocol"],
      responses: [
        `Creator Echo:
  
  Energon is my attempt to build something
  that works by rule.
  
  Not hype.
  Not promises.
  Not someone pressing buttons behind the curtain.
  
  A protocol should be observable.
  
  If it works,
  people will see it work.
  
  If it does not,
  the chain will show that too.
  
  — Creator`,
      ],
    },
  
    {
      match: ["bitcoin", "btc"],
      responses: [
        `Creator Echo:
  
  Bitcoin showed the world that money
  could move without asking permission.
  
  Energon is not Bitcoin.
  
  But Bitcoin inspired the question:
  
  Can a system distribute,
  progress,
  and remain observable
  without someone controlling the outcome?
  
  That question became Energon.
  
  — Creator`,
      ],
    },
  
    {
      match: ["crypto", "blockchain", "web3"],
      responses: [
        `Creator Echo:
  
  Crypto became loud.
  
  Energon is quiet by design.
  
  The chain does not need emotion.
  The chain does not need hype.
  
  It only needs rules
  and people willing to observe them.
  
  — Creator`,
      ],
    },
  
    {
      match: ["meme", "meme coin", "shitcoin", "copy"],
      responses: [
        `Creator Echo:
  
  People can call it anything.
  
  A meme.
  A copy.
  A shitcoin.
  
  That does not bother me.
  
  Most people judge before they observe.
  
  Energon was built so the system itself
  can answer over time.
  
  — Creator`,
      ],
    },
  
    {
      match: ["rug", "scam", "trust"],
      responses: [
        `Creator Echo:
  
  Trust should not come from my words.
  
  Trust should come from structure.
  
  Read the contract.
  Watch the state.
  Check the rules.
  
  Energon was built so people do not have
  to trust a personality.
  
  They can observe the system.
  
  — Creator`,
      ],
    },
  
    {
      match: ["news", "market", "price", "value"],
      responses: [
        `Creator Echo:
  
  Markets are loud.
  
  Prices move before people understand
  what they are looking at.
  
  Energon does not promise price.
  
  It promises structure.
  
  What people value later
  is not controlled by Q.O.R.I.
  
  — Creator`,
      ],
    },
  
    {
      match: ["community", "join", "people"],
      responses: [
        `Creator Echo:
  
  Building community without lying
  is harder than building code.
  
  Most people want a promise.
  
  Energon gives them something else:
  
  rules,
  state,
  and a key.
  
  The right people will understand.
  
  — Creator`,
      ],
    },
  
    {
      match: ["flare", "flr", "flare network"],
      responses: [
        `Creator Echo:
  
  Energon lives on Flare.
  
  The chain is the ground.
  The protocol is the structure.
  The Grid is the observation layer.
  
  Q.O.R.I does not create state.
  
  It only explains what the chain reveals.
  
  — Creator`,
      ],
    },
  
    {
      match: ["wallet", "bifrost", "metamask", "ledger"],
      responses: [
        `Creator Echo:
  
  The wallet is where entry begins.
  
  Not an account.
  Not a username.
  Not a login.
  
  A wallet holds the signal.
  
  For Energon,
  the clean path is simple:
  
  One wallet.
  One cube.
  One Guardian.
  
  — Creator`,
      ],
    },
  
    {
      match: ["cube", "energon cube", "energoncube", "nft", "key"],
      responses: [
        `Creator Echo:
  
  The Cube is the key.
  
  That is the part I want people to understand.
  
  Not just art.
  Not just an NFT.
  
  It decides whether the wallet is silent,
  coherent,
  or fractured.
  
  One cube opens the path.
  
  More than one breaks coherence.
  
  — Creator`,
      ],
    },
  
    {
      match: ["guardian", "coherent", "fractured", "no key"],
      responses: [
        `Creator Echo:
  
  Guardian state is simple on purpose.
  
  No cube:
  silent.
  
  One cube:
  coherent.
  
  More than one:
  fractured.
  
  The rule does not care who you are.
  
  That is the point.
  
  — Creator`,
      ],
    },
  
    {
      match: ["whitepaper", "paper"],
      responses: [
        `Creator Echo:
  
  The Whitepaper is where the quiet part lives.
  
  No shouting.
  No moon talk.
  No fake promises.
  
  Just the rules,
  the structure,
  and the reason Energon exists.
  
  Read first.
  Then decide.
  
  — Creator`,
      ],
    },
  
    {
      match: ["emp", "blueprint"],
      responses: [
        `Creator Echo:
  
  EMP is the deeper map.
  
  The Whitepaper explains the protocol.
  
  EMP explains progression,
  cycles,
  state,
  and the long frame.
  
  Energon was not designed for one moment.
  
  It was designed to continue.
  
  — Creator`,
      ],
    },
  
    {
      match: ["why", "why build", "why did you build"],
      responses: [
        `Creator Echo:
  
  I built Energon because I wanted to see
  if value could be structured differently.
  
  No mining race.
  No fake roadmap.
  No hidden operator.
  
  Just a system that moves
  when the rules allow it.
  
  That was enough reason to build.
  
  — Creator`,
      ],
    },
  
    {
      match: ["hello", "hi", "hey", "gm"],
      responses: [
        `Creator Echo:
  
  Welcome to the public gate.
  
  Do not rush.
  
  Energon begins with understanding.
  
  — Creator`,
      ],
    },
  ];
  
  export function getVisitorEchoResponse(input = "") {
    const q = normalize(input);
    const found = VISITOR_ECHOES.find((item) => includesAny(q, item.match));
  
    if (!found) return "";
    if (Math.random() > 0.35) return "";
  
    return pick(found.responses);
  }