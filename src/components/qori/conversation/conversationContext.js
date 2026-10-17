// Q.O.R.I. Conversation Context
// Pure, read-only subject recognition.
// No wallet reads, transactions, or persistent storage.

const SUBJECTS = [
  ["network", [
    "energon network",
    "energonprojectadapter",
    "energon project adapter",
    "epa",
    "network",
  ]],
  ["evault", ["evault", "e vault", "vault"]],
  ["emp", ["emp", "energon management protocol"]],
  ["collectibles", [
    "nft", "nfts", "collectible", "collectibles",
    "nft collection",
  ]],
  ["cube", [
    "energon cube", "energoncube",
    "cube", "cubes",
  ]],
  ["eon", ["eon", "energon token"]],
  ["wallet", [
    "wallet", "bifrost", "metamask", "ledger",
  ]],
  ["guardian", [
    "guardian", "guardians",
    "coherence", "coherent", "fractured",
  ]],
  ["core", [
    "energon core", "energon protocol",
    "energon", "controller",
  ]],
];

function normalize(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPhrase(input, phrase) {
  const text = normalize(input);
  const target = normalize(phrase);

  return Boolean(
    text &&
    target &&
    ` ${text} `.includes(` ${target} `)
  );
}

export function detectConversationSubject(input = "") {
  for (const [subject, phrases] of SUBJECTS) {
    if (phrases.some((phrase) => hasPhrase(input, phrase))) {
      return subject;
    }
  }

  return "";
}

function isFollowUp(input = "") {
  const text = normalize(input);

  return [
    /^how does (it|this|that) work/,
    /^how do i do (this|that|it)/,
    /^what about/,
    /^what happens next/,
    /^what should i do next/,
    /^what does (it|this|that) mean/,
    /^can you explain/,
    /^can you clarify/,
    /^tell me more/,
    /^explain (it|this|that)/,
    /^go deeper/,
    /^why\b/,
    /^and what/,
  ].some((pattern) => pattern.test(text));
}

export function advanceConversationContext(
  input = "",
  previous = null,
  scope = "visitor"
) {
  const scopeKey = String(scope || "visitor");
  const explicitSubject = detectConversationSubject(input);

  if (explicitSubject) {
    return {
      subject: explicitSubject,
      followUp: false,
      scopeKey,
    };
  }

  const previousSubject =
    previous?.scopeKey === scopeKey
      ? previous.subject || ""
      : "";

  const followUp = Boolean(
    previousSubject && isFollowUp(input)
  );

  return {
    subject: followUp ? previousSubject : "",
    followUp,
    scopeKey,
  };
}

// Convert supported follow-up phrases into explicit subject questions.
// Only uses context established within the active conversation scope.
// No blockchain reads, persistent storage, or state-changing actions.

const CONTEXTUAL_SUBJECT_LABELS = {
  emp: "emp",
  evault: "evault",
  network: "energon network",
  cube: "energon cube",
  eon: "eon",
  wallet: "wallet setup",
  guardian: "guardian coherence",
  collectibles: "energon collectibles",
  core: "energon protocol",
};

export function resolveContextualQuery(input = "", context = null) {
  const originalInput = String(input ?? "");

  // Preserve explicit questions and conversations without valid context.
  if (!context?.followUp || !context?.subject) {
    return originalInput;
  }

  const subject = CONTEXTUAL_SUBJECT_LABELS[context.subject];

  if (!subject) return originalInput;

  const q = normalize(originalInput);

  if (/^how does (it|this|that) work$/.test(q)) {
    return `how does ${subject} work`;
  }

  if (/^tell me more(?: about (it|this|that))?$/.test(q)) {
    if (context.subject === "emp") {
      return "explain emp architecture";
    }
    return `what is ${subject}`;
  }

  // Do not rewrite phrases we cannot interpret confidently.
  return originalInput;
}
