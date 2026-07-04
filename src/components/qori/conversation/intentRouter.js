function normalize(input = "") {
  return String(input).toLowerCase().trim().replace(/\s+/g, " ");
}

function hasAny(q, words = []) {
  return words.some((word) => q === word || q.includes(word));
}

const INTENTS = [
  {
    name: "builder",
    keywords: [
      "dashboard",
      "frontend",
      "backend",
      "code",
      "coding",
      "build",
      "building",
      "react",
      "deploy",
      "vercel",
      "contract",
      "bug",
      "error",
      "testing",
      "test",
      "fix",
      "update",
    ],
  },

  {
    name: "observe",
    keywords: [
      "status",
      "protocol reading",
      "guardian state",
      "height",
      "energon height",
      "tick",
      "burn",
      "era",
      "grid status",
      "how is the grid",
    ],
  },

  {
    name: "community",
    keywords: [
      "community",
      "twitter",
      "x",
      "tweet",
      "post",
      "discord",
      "marketing",
      "followers",
      "users",
      "growth",
      "onboard",
      "onboarding",
      "announcement",
      "whitepaper",
      "emp",
    ],
  },

  {
    name: "explore",
    keywords: [
      "idea",
      "ideas",
      "concept",
      "what if",
      "future",
      "possibility",
      "imagine",
      "explore",
      "discover",
      "curious",
      "learn more",
      "go deeper",
      "deeper",
    ],
  },

  {
    name: "reflection",
    keywords: [
      "purpose",
      "why",
      "mission",
      "meaning",
      "vision",
      "philosophy",
      "reflect",
      "reflection",
    ],
  },

  {
    name: "help",
    keywords: [
      "wallet",
      "connect",
      "connection",
      "transaction",
      "failed",
      "mint",
      "claim",
      "wrong network",
      "metamask",
      "bifrost",
      "ledger",
      "rpc",
    ],
  },
];

export function detectIntent(input = "") {
  const q = normalize(input);

  if (!q) return "conversation";

  const found = INTENTS.find((intent) => hasAny(q, intent.keywords));

  return found ? found.name : "conversation";
}

export function getIntentRegistry() {
  return INTENTS;
}