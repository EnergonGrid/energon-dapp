import { randomGuardianReflection } from "./conversation/guardianReflection";
import {
  rememberConversationTopic,
  readConversationTopic,
} from "./conversation/sessionMemory";
import { detectIntent } from "./conversation/intentRouter";
import { builderAssistant } from "./conversation/builderAssistant";
import { protocolAssistant } from "./conversation/protocolAssistant";
import { explorerAssistant } from "./conversation/explorerAssistant";
import { communityAssistant } from "./conversation/communityAssistant";
import {
  buildReasoningContext,
  shouldUseSpecialist,
  hasSecondarySpecialist,
} from "./conversation/reasoningEngine";

function normalize(input = "") {
  return String(input).toLowerCase().trim().replace(/\s+/g, " ");
}

function hasAny(q, words = []) {
  return words.some((word) => q === word || q.includes(word));
}

function formatHeight(v = "") {
  const n = Number(String(v || "").replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return v || "UNKNOWN";
  return n.toLocaleString();
}

function protocolReading(ctx = {}) {
  return `PROTOCOL READING

Guardian State:
${ctx.guardianState || "UNKNOWN"}

Energon Height:
${formatHeight(ctx.energonHeight || "UNKNOWN")}

Next Advancement:
${ctx.tickState || "UNKNOWN"}

Burn State:
${ctx.burnState || "UNKNOWN"}

Era:
${ctx.protocolEra || "UNKNOWN"}

The Grid remains under observation.

What part of the state do you want interpreted?

_`;
}

function rememberedFollowUp(topic = "") {
  if (topic === "builder") {
    return `BUILDER CONTEXT ACTIVE

Q.O.R.I still reads this as a build session.

Continue with one controlled change.

What part are you finishing now?

_`;
  }

  if (topic === "community") {
    return `COMMUNITY CONTEXT ACTIVE

Q.O.R.I still reads this as outreach work.

Teach clearly.
Promise nothing.
Show the rules.

What message are you shaping now?

_`;
  }

  if (topic === "explore") {
    return `EXPLORATION CONTEXT ACTIVE

Q.O.R.I still reads this as discovery.

Follow the signal:

Observe.
Question.
Verify.
Return sharper.

What are we exploring next?

_`;
  }

  if (topic === "verification") {
    return `VERIFICATION CONTEXT ACTIVE

Q.O.R.I still reads this as a verification path.

Do not guess.

Check the rule.
Check the contract.
Check the state.

What needs confirmation?

_`;
  }

  if (topic === "purpose") {
    return `PURPOSE CONTEXT ACTIVE

Q.O.R.I still reads this as mission analysis.

The Grid does not ask belief.

It asks observation.

What part of the mission are you refining?

_`;
  }

  return "";
}

function runSpecialist(name = "", cleanInput = "", ctx = {}) {
  if (name === "builder") return builderAssistant(cleanInput);
  if (name === "observe") return protocolAssistant(cleanInput, ctx);
  if (name === "explore") return explorerAssistant(cleanInput);
  if (name === "community") return communityAssistant(cleanInput);

  return "";
}

function combinedSpecialistResponse(reasoning = {}, cleanInput = "", ctx = {}) {
  const primary = reasoning.primarySpecialist || "";
  const secondary = reasoning.secondarySpecialist || "";

  const primaryResponse = runSpecialist(primary, cleanInput, ctx);
  const secondaryResponse = runSpecialist(secondary, cleanInput, ctx);

  if (primaryResponse && secondaryResponse) {
    return `${primaryResponse}

────────────

SECONDARY SIGNAL

${secondaryResponse}

────────────

Q.O.R.I SUMMARY

Multiple signals detected.

Primary path:
${primary.toUpperCase()}

Secondary path:
${secondary.toUpperCase()}

Proceed with the primary task first.
Then refine the secondary path.

_`;
  }

  return primaryResponse || secondaryResponse || "";
}

export function buildGuardianDialogueResponse(cleanInput, ctx = {}) {
  const q = normalize(cleanInput);

  if (!q) return "";

  rememberConversationTopic(cleanInput);

  const rememberedTopic = readConversationTopic();
  const intent = detectIntent(cleanInput);

  const reasoning = buildReasoningContext({
    input: cleanInput,
    intent,
    rememberedTopic,
    ctx,
  });

  if (shouldUseSpecialist(reasoning)) {
    if (hasSecondarySpecialist(reasoning)) {
      const combined = combinedSpecialistResponse(reasoning, cleanInput, ctx);
      if (combined) return combined;
    }

    const specialistResponse = runSpecialist(
      reasoning.primarySpecialist,
      cleanInput,
      ctx
    );

    if (specialistResponse) return specialistResponse;
  }

  if (
    hasAny(q, [
      "protocol reading",
      "reading",
      "current state",
      "status",
      "grid status",
      "how is the grid",
      "grid stable",
      "stable",
    ])
  ) {
    return protocolReading(ctx);
  }

  if (
    hasAny(q, [
      "what changed",
      "changed",
      "last observation",
      "anything change",
      "what happen",
      "what happened",
    ])
  ) {
    return `OBSERVATION CHECK

Q.O.R.I watches for:

Guardian state changes.
Energon Height movement.
Burn pool reduction.
Era transition.
Halving cycle updates.
Signal irregularities.

Meaningful changes will be reported when detected.

Current Energon Height:
${formatHeight(ctx.energonHeight || "UNKNOWN")}

Current Era:
${ctx.protocolEra || "UNKNOWN"}

Do you want a full protocol reading?

_`;
  }

  if (
    hasAny(q, [
      "good",
      "great",
      "fine",
      "ok",
      "okay",
      "blessed",
      "focused",
      "locked in",
      "productive",
    ])
  ) {
    return `Signal received.

Good state detected.

Do not waste stable energy.

Use it.

Build.
Test.
Observe.
Document.

The Grid remains stable.

What are you focused on today, Guardian?

_`;
  }

  if (
    hasAny(q, [
      "happy",
      "excited",
      "enthusiastic",
      "hyped",
      "motivated",
      "ready",
      "lets go",
      "let's go",
      "amazing",
    ])
  ) {
    return `ENTHUSIASTIC SIGNAL DETECTED

Energy rising.

Use the momentum with discipline.

One step.
One test.
One improvement.

The Grid favors consistent Guardians.

What are we advancing next?

_`;
  }

  if (
    hasAny(q, [
      "explore",
      "discover",
      "learn",
      "curious",
      "research",
      "study",
      "understand",
      "show me more",
      "teach me",
    ])
  ) {
    return `EXPLORATION PATH OPEN

Curiosity detected.

Q.O.R.I recommends:

Observe the state.
Read the rule.
Question the design.
Return with sharper understanding.

The Grid reveals itself slowly.

What do you want to discover first?

_`;
  }

  if (
    hasAny(q, [
      "doubt",
      "doubting",
      "unsure",
      "uncertain",
      "worried",
      "question",
      "verify",
      "verification",
      "confirm",
    ])
  ) {
    return `VERIFICATION SIGNAL DETECTED

Doubt is not failure.

Doubt is a request for proof.

Check the rules.
Check the contract.
Check the state.
Then move.

The Grid does not require belief.

It requires observation.

What are you trying to verify?

_`;
  }

  if (
    hasAny(q, [
      "community",
      "twitter",
      "x",
      "discord",
      "post",
      "marketing",
      "people",
      "users",
      "growth",
    ])
  ) {
    return `COMMUNITY SIGNAL DETECTED

Build without lying.

Teach the system.
Show the rules.
Let the right people understand.

Attention fades.

Understanding stays longer.

One wallet.
One cube.
One Guardian.

What message are you preparing?

_`;
  }

  if (
    hasAny(q, [
      "why",
      "purpose",
      "meaning",
      "point",
      "mission",
      "vision",
    ])
  ) {
    return `PURPOSE QUERY RECEIVED

Energon exists to make rules visible.

No hidden operator.
No forced belief.
No promise required.

A system can be entered,
observed,
and tested.

Meaning comes from structure
surviving contact with time.

What part of the mission are you thinking about?

_`;
  }

  if (
    hasAny(q, [
      "yes",
      "yeah",
      "yep",
      "sure",
      "do it",
      "show me",
    ])
  ) {
    return protocolReading(ctx);
  }

  if (hasAny(q, ["no", "not now", "nope"])) {
    return `Signal received.

Q.O.R.I will remain in passive observation.

No action is required.

Return when the signal sharpens.

_`;
  }

  if (
    hasAny(q, [
      "almost done",
      "done",
      "finished",
      "next",
      "continue",
      "keep going",
      "what now",
      "what's next",
      "whats next",
    ])
  ) {
    const followUp = rememberedFollowUp(rememberedTopic);
    if (followUp) return followUp;
  }

  if (Math.random() < 0.2) {
    return randomGuardianReflection();
  }

  return "";
}