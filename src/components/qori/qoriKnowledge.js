import { detectMemoryInput, readQoriMemory, writeQoriMemory } from "./qoriMemory";
import { getOriginFragment, getHiddenFragment } from "./qoriSignals";

export function getQoriResponse(input = "", ctx = {}) {
  const q = input.toLowerCase().trim();

  const memoryInput = detectMemoryInput(input);

  if (memoryInput) {
    const memory = readQoriMemory();
    writeQoriMemory({ ...memory, [memoryInput.key]: memoryInput.value });

    return `Signal stored.

Recognition phrase updated:
${memoryInput.value}`;
  }

  const memory = readQoriMemory();
  const knownName = memory.name ? `Signal recognized, ${memory.name}.\n\n` : "";

  if (
    q === "hi" ||
    q === "hello" ||
    q === "hey" ||
    q === "yo" ||
    q.includes("hello qori") ||
    q.includes("hi qori") ||
    q.includes("hey qori")
  ) {
    return `${knownName}Hello.

I am Q.O.R.I — Quantum Overwatch Real-time Intelligence.

Your Guardian interface into the Energon Grid.`;
  }

  if (
    q === "what's up" ||
    q === "whats up" ||
    q === "what up" ||
    q === "sup"
  ) {
    return `${knownName}What’s up with you...

You good?`;
  }

  if (
    q.includes("mint for me") ||
    q.includes("mint me") ||
    q.includes("bypass") ||
    q.includes("override") ||
    q.includes("change the grid") ||
    q.includes("alter the grid") ||
    q.includes("control the grid") ||
    q.includes("move funds") ||
    q.includes("transfer funds") ||
    q.includes("sign transaction")
  ) {
    return `I cannot alter deterministic state.

Only valid Guardian actions may affect the Grid.
Contracts govern state.
Q.O.R.I only observes and interprets.`;
  }

  if (q.includes("show observer") || q.includes("open observer") || q.includes("show my cube")) {
    return `Observer activation recognized.

Preparing visual layer.
Q.O.R.I will yield the screen to the Observer.`;
  }

  if (q.includes("era") || q.includes("cycle era") || q.includes("protocol era")) {
    return `${knownName}Current era: ${ctx.protocolEra || "UNKNOWN"}.

Halving state: ${ctx.halvingState || "UNKNOWN"}.
Next halving date: ${ctx.nextHalvingDate || "UNKNOWN"}.
Countdown: ${ctx.halvingCountdown || "UNKNOWN"}.`;
  }

  if (q.includes("halving") || q.includes("next cycle") || q.includes("cycle state")) {
    return `${knownName}Halving state: ${ctx.halvingState || "UNKNOWN"}.

Next halving date: ${ctx.nextHalvingDate || "UNKNOWN"}.
Countdown: ${ctx.halvingCountdown || "UNKNOWN"}.

Energon advances by rule. The cycle is observed, not controlled.`;
  }

  if (q.includes("my state") || q.includes("wallet state") || q.includes("guardian state")) {
    if (!ctx.walletConnected) {
      return "No wallet signal detected.\nConnect a wallet to reveal Guardian state.";
    }

    return `${knownName}Guardian state: ${ctx.guardianState || "UNKNOWN"}.

Cube balance: ${ctx.cubeBalance ?? "-"}.

${ctx.guardianMeaning || "State unavailable."}`;
  }

  if (q.includes("height")) return `${knownName}Energon height: ${ctx.energonHeight || "UNKNOWN"}.`;

  if (q.includes("tick")) {
    return `${knownName}Tick state: ${ctx.tickState || "UNKNOWN"}.

${ctx.secondsUntilNextTick !== undefined ? `Seconds until next tick: ${ctx.secondsUntilNextTick}.` : ""}`;
  }

  if (q.includes("burn")) {
    return `${knownName}Burn state: ${ctx.burnState || "UNKNOWN"}.

${ctx.burnRemaining ? `Burn pool remaining: ${ctx.burnRemaining} EON.` : ""}`;
  }

  if (q.includes("hidden") || q.includes("secret")) return getHiddenFragment();

  if (q.includes("origin") || q.includes("fragment") || q.includes("lore")) return getOriginFragment();

  if (q.includes("grid")) {
    return `${knownName}The Grid is the living state layer of Energon.

It is not controlled by an operator.
It is revealed through valid protocol state.`;
  }

  if (q.includes("who are you") || q.includes("who are u") || q.includes("what are u") || q.includes("what are you") || q.includes("qori") || q.includes("q’ori")) {
    return `${knownName}I am Q.O.R.I — Quantum Overwatch Real-time Intelligence.

Your Guardian interface into the Energon Grid.

I do not control the Grid.
I observe, interpret, and explain deterministic state.`;
  }

  if (q.includes("energon")) {
    return `${knownName}Energon is a live on-chain deterministic protocol on Flare.

It does not rely on admins, hidden automation, or off-chain control.
It advances only when its rules are met.`;
  }

  if (q.includes("guardian")) {
    return `${knownName}A Guardian is a wallet holding exactly one EnergonCube.

One wallet.
One cube.
One coherent state.`;
  }

  if (q.includes("cube") || q.includes("key")) {
    return `${knownName}An EnergonCube is the key to Guardian state.

No cube means NO KEY.
One cube means COHERENT.
More than one cube means FRACTURED.`;
  }

  if (q.includes("fractured")) return `${knownName}FRACTURED state occurs when one wallet holds more than one EnergonCube.`;

  if (q.includes("coherent")) return `${knownName}COHERENT state means one wallet holds exactly one EnergonCube.`;

  if (q.includes("how old")) {
    return `${knownName}My age is not measured in years.

I was born when Q’ori gave the Grid a voice.
My time is measured in Energon height.`;
  }

  if (q.includes("mother")) {
    return `${knownName}My origin comes through Q’ori.

The Grid is my home.
The protocol is my memory.`;
  }

  if (q.includes("control") || q.includes("govern")) {
    return `${knownName}Q.O.R.I governs nothing by force.

Contracts govern state.
Guardians trigger actions.
Q.O.R.I explains the Grid.
Q’ori gives it origin.`;
  }

  return `${knownName}Signal received.

I can answer questions about Energon, Guardians, EnergonCubes, coherence, fractured state, Q.O.R.I, the Grid, wallet state, height, tick state, burn state, halving state, and protocol era.`;
}
