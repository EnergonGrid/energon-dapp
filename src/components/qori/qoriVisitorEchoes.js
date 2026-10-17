import {
  normalizeText as normalize,
  hasAnyPhrase as includesAny,
} from "./conversation/matchUtils";

function pick(list = []) {
    return list[Math.floor(Math.random() * list.length)] || "";
  }
  
  const VISITOR_ECHOES = [
    {
      match: ["bitcoin", "btc"],
      responses: [
        `Creator Echo:

Bitcoin made me look at money and financial systems differently.

It showed that people could participate in something without needing one person or institution to control every transaction.

But I wasn't trying to build another Bitcoin.

I started asking myself a different question. What if I could build a protocol where identity, progression, distribution, and the rules were established in advance, instead of someone deciding how everything should work along the way?

That's where my thinking about Energon began.

I wanted to build something people could examine for themselves. Something where the rules matter more than whoever created it.

Bitcoin helped open that door for me. Energon is my attempt to explore what else might be possible.

— Creator`,
      ],
    },

    {
      match: ["what is energon", "energon", "protocol"],
      responses: [
        `Creator Echo:
  
  Energon is my attempt to build something
  that works by rule.
  
  Not hype.
  Not promises.
  Not hidden control
  deciding protocol progression
  behind the curtain.
  
  A protocol should be observable.
  
  If it works,
  people will see it work.
  
  If it does not,
  the chain will show that too.
  
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

When someone becomes a Guardian, I don't look at it as just another number added to the Grid.

I think about the fact that they stopped, looked at something I built, and decided it was worth their time.

That means something to me.

Not everyone is going to walk into Energon knowing everything. Some people will be excited, some will be skeptical, and others won't know the first thing about wallets or smart contracts.

And that's fine.

If you know the answer to somebody's question, help them out. If you notice something that doesn't make sense, bring it up. And if you disagree with me, say so. I can respect someone who thinks for themselves.

I don't want a community where everybody just repeats the same message.

I want people to actually get to know each other, share ideas, and help the next person coming through the door.

Energon's contracts don't need a crowd cheering for them to operate.

But people still need people.

That's the part no smart contract can create for us.

So to the Guardians who have joined, and to everyone taking the time to understand this project, thank you.

I appreciate you giving Energon a chance.

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

When I created EnergonCube, I knew some people would look at it and see just another NFT.

But that's not what I was trying to build.

I wanted something that could represent your place in Energon without needing someone to approve you, manage an account, or decide whether you belong.

That's where the Cube comes in.

It's a key that belongs to your wallet, and the smart contract can verify it directly on the blockchain.

The artwork gives the Cube its identity, but what matters to me is what it actually does.

It connects the wallet to the Guardian rules. Whether you're Silent, Coherent, or Fractured isn't something I get to decide for you. The contract determines that from the cubes your wallet holds.

I wanted people to understand that owning a Cube means more than having another digital collectible.

It's your key to participating in the Grid.

One wallet. One cube. One Guardian.

— Creator`,
      ],
    },
  
    {
      match: ["guardian", "coherent", "fractured", "no key"],
      responses: [
        `Creator Echo:

When I designed the Guardian system, I didn't want someone's identity in Energon to depend on how many cubes they could collect.

I wanted something simple. Something everyone could understand, and something the contract could enforce without treating one person differently from another.

That's why I established the rule of one wallet, one cube, one Guardian.

If your wallet doesn't hold a cube, you're Silent. If it holds exactly one, you're Coherent. If you hold two or more, you're Fractured.

And that's intentional.

Having more cubes doesn't make you a stronger Guardian. In fact, it breaks your coherence.

To me, being a Guardian isn't about collecting the most keys. It's about holding your place in the Grid and understanding the responsibility that comes with it.

I wanted the rules to determine your Guardian state, not me or anybody else.

That's why I built it this way.

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
      match: ["how does emp work"],
      responses: [
        `Creator Echo:

When I started building Energon, one thing mattered to me: I didn't want a system where somebody could just decide to change the outcome whenever it suited them.

I wanted rules people could actually see and understand.

That's why the contracts matter. When someone interacts with Energon, the contract checks the conditions and determines what happens.

And I don't expect anyone to believe in Energon just because I created it.

Look at the rules. Watch how the system behaves. Ask questions.

If something works, you should be able to see it for yourself.

That's what I wanted to build.

— Creator`,
      ],
    },

    {
      match: ["emp", "blueprint"],
      responses: [
        `Creator Echo:

When I put EMP together, I wanted people to understand more than just what Energon is. I wanted them to see how everything connects.

The Whitepaper explains the foundation. EMP goes further. It shows how the Controller, Guardian rules, EVault, and Energon Network fit into the bigger picture.

I don't expect anyone to take my word for it just because I built Energon.

Read the documentation. Look at the contracts. Ask questions.

If something doesn't make sense, I want people to understand it before they make a decision.

That's why EMP exists. Not to tell people what to believe, but to give them something they can actually examine for themselves.

— Creator`,
      ],
    },
  
    {
      match: ["why", "why build", "why did you build"],
      responses: [
        `Creator Echo:

When I started thinking about Energon, I wasn't interested in creating another token just to see what price people would put on it.

I wanted to build something different.

I looked at how financial systems operate, how decisions are made, and how much control can rest in the hands of a few people.

And I kept coming back to one question: What if the rules were established from the beginning, and nobody, including me, could simply change them whenever they wanted?

That's where Energon began.

I wanted a system with its own progression, its own distribution rules, and a way for people to participate without needing someone behind the scenes controlling everything.

That doesn't mean I expect people to agree with every decision I made.

Actually, I'd rather they question it.

Read the contracts. Understand the rules. Decide whether the structure makes sense to you.

I built Energon because I wanted to explore what a system could become when its rules mattered more than the person who created it.

And I wanted it to be capable of continuing long after I'm gone.

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
    const isBitcoin = /\b(?:bitcoin|btc)\b/.test(q);
    const isWalletSetup = /\b(?:wallet|bifrost|metamask|ledger)\b/.test(q) &&
      /\b(?:set\s*up|setup|connect|install|create|import|switch|fund)\b/.test(q);
    const guardianRuleQuestion = !isBitcoin && !isWalletSetup && (
      /\bguardians?\b/.test(q) ||
      (/\bcoherence\b/.test(q) && /\bcubes?\b/.test(q))
    );
    const guardianMatch = guardianRuleQuestion
      ? VISITOR_ECHOES.find((item) => item.match.includes("guardian"))
      : null;
    const whyEnergon = /^why\s+(?:did\s+you\s+(?:build|create)\s+energon|was\s+energon\s+created)\s*\??$/.test(q);
    const motivationMatch = whyEnergon
      ? VISITOR_ECHOES.find((item) => item.match.includes("why did you build"))
      : null;
    const communityQuestion = !isBitcoin && !isWalletSetup && (
      /\bcommunit(?:y|ies)\b/.test(q) ||
      (/\bguardians?\b/.test(q) &&
        /\b(?:new|join|joining|joined|welcome|welcoming)\b/.test(q))
    );
    const communityMatch = communityQuestion
      ? VISITOR_ECHOES.find((item) => item.match.includes("community"))
      : null;
    const found = communityMatch || guardianMatch || motivationMatch ||
      VISITOR_ECHOES.find((item) => includesAny(q, item.match));
  
    if (!found) return "";
    if (Math.random() > 0.35) return "";
  
    return pick(found.responses);
  }