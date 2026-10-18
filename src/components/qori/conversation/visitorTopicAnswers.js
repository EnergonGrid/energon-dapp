// Approved Visitor-only educational responses.
export const VISITOR_TOPIC_ANSWERS = {
  eon: `EON is more than a token with a name.

It is the native token of the Energon protocol, with a maximum supply of 30 million EON.

Here's where things get interesting.

Energon doesn't create new EON every time the protocol advances. The supply already exists. Eligible on-chain progression determines how EON is distributed or burned according to the Controller's rules.

Energon also operates through four-year halving cycles.

These mechanics define how EON functions within the protocol. They don't guarantee what someone will pay for it on the market.

Would you like to understand how Energon's burn and halving cycles work?`,

  observer: `You don't have to become a Guardian to observe Energon.

That's one of the reasons the Observer exists.

The Observer provides a public window into the protocol's on-chain state.

You can explore Energon Height, progression, halving information, and available burn-related readings.

And here's the important distinction.

Observing the protocol doesn't mean controlling it.

The Observer cannot advance the clock, move your tokens, or change the rules. It simply helps you understand what the blockchain reports.

Would you like to explore the Observer?`,
};

export function getVisitorTopicAnswer(openingId) {
  return VISITOR_TOPIC_ANSWERS[openingId] || null;
}
