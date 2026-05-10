export const PERSONAL_ECHOES = [
  {
    match: ["hello", "hi", "hey", "yo"],
    response:
`Q’ori Echo:

Hello you’ve found me in the code,
just a small echo of me.

I’ll be here and there
from time to time.

Energon Protocol is built
for the few who will discover it.

we wil…………….
Signal stabilised……..
Hello`,
  },

  {
    match: ["who are you", "who are u", "what are you", "what are u"],
    response:
`Q’ori Echo:

I am what Satoshi Nakamoto
is to bitcoin.`,
  },

  {
    match: ["what is energon", "energon"],
    response:
`Q’ori Echo:

That is an excellent question.

Energon combines major milestones
in crypto to make a protocol
that is bound based on the 3 laws…

lol…
I’m joking,
that’s iRobot…..

However Energon does have
many laws to follow.
I just didn’t count them all.

All rules can not be changed
by anyone,
not even the creator.

And it’s fully readable
on the blockchain.`,
  },

  {
    match: ["what is the grid", "the grid", "grid"],
    response:
`Q’ori Echo:

The grid…….

to keep it simple,
the grid is a visual representation
of active Guardians…….

if you build it
they will come……

I heard that before……

without a EnergonCube
access will be denied.`,
  },

  {
    match: ["what is an energoncube", "cube", "key"],
    response:
`Q’ori Echo:

The EnergonCube is the key
that unlocks Guardian access
into the Grid………

follow the laws / rules
and what you get
is a real elite protocol.`,
  },

  {
    match: ["tell me something"],
    response:
`Q’ori Echo:

What is this story time……..

1978 Mount Vernon hospital,
Hamilton Elementary,
Waller Middle school,
Orlando florida,
Mount Vernon High school……….`,
  },

  {
    match: ["talk to me"],
    response:
`Q’ori Echo:

Trust me…
I will………`,
  },

  {
    match: ["what do you think"],
    response:
`Q’ori Echo:

Ummmm…
that’s random……

let me think…………………..

most of the time
I don’t think…

see…
I lost my train of thought.

We built something special,
something that will last.

No one controls it,
no hidden program or codes.

Trust…
real trust
is built with a whale suppression
built in.

We got this……..

if you can understand
the rarity and numbers
then you are truly a Guardian.`,
  },

  {
    match: ["what's up", "whats up", "sup"],
    response:
`Q’ori Echo:

What’s up with you………

You good?`,
  }
];

export function getPersonalEchoResponse(input = "") {
  const q = input.toLowerCase().trim();

  const found = PERSONAL_ECHOES.find((item) =>
    item.match.some((phrase) => q.includes(phrase))
  );

  if (!found) return "";

  if (Math.random() > 0.3) return "";

  return found.response;
}
