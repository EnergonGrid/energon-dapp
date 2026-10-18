// Approved Visitor learning paths.
// Pure educational routing; no wallet or blockchain actions.

export const LEARNING_PATHS = {
  energon: {
    next: "cube",
    question: "Would you like to know what makes someone a Guardian?",
  },
  grid: {
    next: "observer",
    question: "Would you like to see what the Observer can show you?",
  },
  cube: {
    next: "wallet",
    question: "Would you like to learn how to prepare a wallet for Guardian access?",
  },
  clock: {
    next: "eon",
    question: "Would you like to understand how EON burns and halving cycles fit into that progression?",
  },
  eon: {
    next: "emp",
    question: "Would you like to understand how Energon's burn and halving cycles work?",
  },
  wallet: {
    next: "whitepaper",
    question: "Would you like to understand the protocol's rules before connecting?",
  },
  whitepaper: {
    next: "emp",
    question: "Would you like to see how EMP connects those rules to the wider architecture?",
  },
  emp: {
    next: "evault",
    question: "Would you like to learn how Main EVault protects commitments and reserves?",
  },
  evault: {
    next: "network",
    question: "Would you like to explore how projects connect through the Energon Network?",
  },
  network: {
    next: "grid",
    question: "Would you like to see how EnergonGrid makes network activity observable?",
  },
  observer: {
    next: "observer-page",
    question: "Would you like to explore the Observer?",
  },
  chronicle: {
    next: "cube",
    question: "Would you like to understand how someone becomes a Guardian?",
  },
  closing: {
    next: "energon",
    question: "Would you like to explore Energon from the beginning?",
  },
};

export const OPENING_TOPICS = {
  welcome: "energon",
  grid: "grid",
  "guardian-mystery": "cube",
  clock: "clock",
  eon: "eon",
  preparation: "wallet",
  foundation: "whitepaper",
  architecture: "emp",
  evault: "evault",
  network: "network",
  observer: "observer",
  chronicle: "chronicle",
};

export const LEARNING_QUERIES = {
  energon: "what is energon",
  grid: "what is energongrid",
  cube: "what is energoncube",
  clock: "how does emp work",
  eon: "what is eon",
  wallet: "wallet setup",
  whitepaper: "whitepaper",
  emp: "explain emp architecture",
  evault: "evault",
  network: "energon network",
  observer: "observer",
  chronicle: "guardian chronicle",
  closing: "closing thought",
};

const TOPIC_ALIASES = {
  "1": "energon",
  "what is energon": "energon",
  "2": "grid",
  "what is energongrid": "grid",
  "what is energon grid": "grid",
  "3": "cube",
  "what is energoncube": "cube",
  "what is energon cube": "cube",
  "how does energon progress": "clock",
  "what is eon": "eon",
  "what is the energon token": "eon",
  "wallet setup": "wallet",
  "what is the whitepaper": "whitepaper",
  "what is emp": "emp",
  "what is evault": "evault",
  "what is energon network": "network",
  "what is the observer": "observer",
  "what is guardian chronicle": "chronicle",
  "9": "closing",
  "closing thought": "closing",
};

export function resolveLearningTopic(input = "") {
  const q = String(input).toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return TOPIC_ALIASES[q] || null;
}

export function getLearningStep(topic) {
  const path = LEARNING_PATHS[topic];
  if (!path) return null;

  return {
    topic,
    query: LEARNING_QUERIES[topic],
    question: path.question,
    next: path.next,
  };
}

export function planLearningTurn(input, pending = "", openingId = "") {
  const q = String(input || "").trim().toLowerCase();

  if (["home", "list", "menu"].includes(q)) {
    return { action: "menu", pending: "" };
  }

  const learning = pending.startsWith("learn:");
  if (q === "no" && (pending === "welcome" || learning)) {
    return { action: "decline", pending: "" };
  }

  if (q === "yes" && pending === "welcome") {
    const topic = OPENING_TOPICS[openingId] || "energon";
    return { action: "lesson", topic, pending: `learn:${topic}` };
  }

  if (q === "yes" && learning) {
    const topic = pending.slice(6);
    const next = LEARNING_PATHS[topic]?.next;

    if (next === "observer-page") {
      return { action: "navigate-observer", pending: "" };
    }
    if (LEARNING_PATHS[next]) {
      return { action: "lesson", topic: next, pending: `learn:${next}` };
    }
  }

  const topic = resolveLearningTopic(input);
  if (topic) {
    return { action: "lesson", topic, pending: `learn:${topic}` };
  }

  return { action: "freeform", pending: "" };
}
