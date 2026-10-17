import {
  normalizeText as normalize,
  hasAnyPhrase as hasAny,
} from "./matchUtils";

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

  // Document navigation takes priority over general topic matching.
  if (hasAny(q, [
    "read emp",
    "read the emp",
    "open emp",
    "open the emp",
    "view emp",
    "view the emp",
  ])) {
    return "navigation";
  }

  // EMP operational questions must not fall into Community.
  if (
    hasAny(q, ["emp"]) &&
    hasAny(q, [
      "how is",
      "status",
      "observation",
      "health",
      "state",
      "reserves",
      "threshold",
    ])
  ) {
    return "observe";
  }

  // Educational questions should not become generic reflections.
  // Keep live EMP observations and document navigation above this rule.
  if (
    /^(?:what is|how does|why does)\s+(?:(?:the|an?)\s+)?(?:emp|evault|e vault|energon network)\b/.test(q) ||
    /^explain\s+emp\s+architecture\b/.test(q)
  ) {
    return "education";
  }

  const found = INTENTS.find((intent) => hasAny(q, intent.keywords));

  return found ? found.name : "conversation";
}
