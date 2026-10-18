// Approved Visitor introductions. No wallet or blockchain actions.
export const VISITOR_OPENINGS_EXTRA = [
  {
    id: "grid",
    query: "what is energongrid",
    text: `You've found the Grid.

You don't need a wallet to begin exploring.

But there's more happening here than what you see on the screen.

Would you like me to show you what EnergonGrid is?`,
  },
  {
    id: "guardian-mystery",
    query: "what is energoncube",
    text: `Here's something unusual about Energon.

One cube establishes coherence. Two or more fracture it.

Yes, you read that correctly.

Curious why the protocol works that way?`,
  },
  {
    id: "clock",
    query: "how does emp work",
    text: `Time has a special meaning inside Energon.

But the clock reaching its next interval doesn't automatically move the protocol forward.

Would you like to understand how Energon progresses?`,
  },
  {
    id: "eon",
    query: "explain emp architecture",
    text: `Every token has a name. Not every token has the same rules.

EON has a defined supply, distribution structure, and burn mechanics.

Would you like to understand what gives EON its role in Energon?`,
  },
  {
    id: "preparation",
    query: "wallet setup",
    text: `Thinking about joining Energon?

There's no need to rush into connecting a wallet.

Understanding the preparation is a good place to begin.

Would you like me to walk you through it?`,
  },
  {
    id: "foundation",
    query: "whitepaper",
    text: `Every system has a foundation.

Energon's Whitepaper explains the principles behind the protocol and the rules that define it.

Would you like to discover what those principles are?`,
  },
  {
    id: "architecture",
    query: "emp",
    text: `You've probably heard the word protocol before.

But Energon also has something called EMP.

Think of it as a way to understand how the larger pieces fit together.

Would you like an introduction?`,
  },
  {
    id: "evault",
    query: "evault",
    text: `There's more to Energon than cubes and tokens.

EVault introduces rules for commitments, claims, and protecting reserves.

Curious why those protections matter?`,
  },
  {
    id: "network",
    query: "energon network",
    text: `Energon isn't intended to end at a single application.

Its Network architecture describes how projects, Nodes, and EFlows can fit into a larger ecosystem.

Would you like to explore that idea?`,
  },
  {
    id: "observer",
    query: "what is energongrid",
    text: `Here's something I appreciate about Energon.

You can observe what the protocol reports without becoming a Guardian first.

Want to know what the Observer can show you?`,
  },
  {
    id: "chronicle",
    query: "guardian chronicle",
    text: `The protocol preserves its rules on-chain.

But what about the people who become part of its history?

That's why the Guardian Chronicle exists.

Would you like to hear its story?`,
  },
];

export function getVisitorOpenings(originalWelcome) {
  return [
    {
      id: "welcome",
      text: originalWelcome,
      query: "what is energon",
      next: "guardian",
    },
    ...VISITOR_OPENINGS_EXTRA,
  ];
}

// Select one opening per Visitor session.
// Each of the twelve introductions has equal probability.
export function pickVisitorOpening(originalWelcome, random = Math.random) {
  const openings = getVisitorOpenings(originalWelcome);
  const value = random();
  const index = Math.min(
    openings.length - 1,
    Math.max(0, Math.floor(value * openings.length))
  );
  return openings[index];
}
