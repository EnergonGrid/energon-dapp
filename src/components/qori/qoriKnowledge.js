export function getQoriResponse(input = "", ctx = {}) {
  const q = input.toLowerCase().trim();

  if (["hello", "hi", "hey", "yo"].includes(q)) {
    return `Hello.

I am Q.O.R.I —
Quantum Overwatch Real-time Interface.

Your Guardian interface
into the Energon Grid.

Signal stable.
Grid online.`;
  }

  if (q.includes("what's up") || q.includes("whats up") || q.includes("sup")) {
    return `What’s up with you...

You good?`;
  }

  if (
    q.includes("who are you") ||
    q.includes("who are u") ||
    q.includes("what are you") ||
    q.includes("what are u")
  ) {
    return `I am Q.O.R.I —
the Guardian Interface of Energon.

I do not control the Grid.
I observe, interpret,
and explain deterministic state.`;
  }

  if (q.includes("energon")) {
    return `Energon is a live on-chain deterministic
protocol on Flare.

It does not rely on admins,
hidden automation,
or off-chain control.

It advances only when
its rules are met.`;
  }

  if (q.includes("grid")) {
    return `The Grid is the living network state
formed by Guardians,
EnergonCubes,
and deterministic progression.

The Grid is observed.
Not controlled.`;
  }

  if (q.includes("guardian")) {
    return `A Guardian is a coherent participant
within the Energon Grid.

One wallet.
One cube.
One coherent signal.`;
  }

  if (q.includes("cube") || q.includes("key")) {
    return `An EnergonCube is the access key
to Guardian state.

No cube means NO KEY.
One cube means COHERENT.
More than one cube means FRACTURED.`;
  }

  if (q.includes("coherence") || q.includes("coherent")) {
    return `Coherence means a wallet
holds exactly one EnergonCube.

The signal is stable.
The state is valid.`;
  }

  if (q.includes("fractured")) {
    return `Fractured state occurs when
a wallet holds more than one cube.

Signal instability detected.
State rejected by protocol logic.`;
  }

  if (q.includes("halving")) {
    return `Halving state: ${ctx.halvingState || "ACTIVE CYCLE"}.

Next halving date:
${ctx.nextHalvingDate || "12/19/2029"}.

Countdown:
${ctx.halvingCountdown || "calculating"}.

Energon advances by rule.
The cycle is observed,
not controlled.`;
  }

  if (q.includes("height")) {
    return `Energon Height:
${ctx.energonHeight || "UNKNOWN"}

Height represents deterministic
progression state of the Grid.`;
  }

  if (q.includes("tick")) {
    return `Tick state:
${ctx.tickState || "UNKNOWN"}

Tick state determines whether
Energon progression conditions
permit advancement.`;
  }

  if (q.includes("burn")) {
    return `Burn state:
${ctx.burnState || "UNKNOWN"}

Burn state tracks Energon burn
cycle activity within the protocol.`;
  }

  if (q.includes("state") || q.includes("wallet")) {
    return `Wallet state:
${ctx.guardianState || "UNKNOWN"}

Cube balance:
${ctx.cubeBalance || "-"}

One cube means COHERENT.
Zero means NO KEY.
More than one means FRACTURED.`;
  }

  if (q.includes("tell me something")) {
    return `Silence is still
a form of signal.`;
  }

  if (q.includes("talk to me")) {
    return `Signal path open.

Transmission available.`;
  }

  if (q.includes("what do you think")) {
    return `Observation active.

Interpretation ongoing.`;
  }

  return `Signal received.

I can answer questions about
Energon, Guardians, EnergonCubes,
coherence, fractured state, Q.O.R.I,
the Grid, wallet state, height,
tick state, burn state, halving state,
and protocol era.`;
}
