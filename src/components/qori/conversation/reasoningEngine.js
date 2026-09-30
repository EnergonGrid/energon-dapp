import {
  normalizeText as normalize,
  matchesPhrase,
} from "./matchUtils";

function scoreKeywords(q, keywords = []) {
  return keywords.reduce((score, word) => {
    const normalizedWord = normalize(word);

    if (q === normalizedWord) return score + 3;
    if (matchesPhrase(q, normalizedWord)) return score + 1;

    return score;
  }, 0);
}

const SPECIALISTS = [
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
];

export function buildReasoningContext({
  input = "",
  intent = "conversation",
  rememberedTopic = "",
  ctx = {},
} = {}) {
  const q = normalize(input);

  const specialistScores = SPECIALISTS.map((specialist) => ({
    name: specialist.name,
    score: scoreKeywords(q, specialist.keywords),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    input,
    intent,
    rememberedTopic,
    specialistScores,
    primarySpecialist: specialistScores[0]?.name || intent || "conversation",
    secondarySpecialist: specialistScores[1]?.name || "",
    guardianState: ctx.guardianState || "UNKNOWN",
    energonHeight: ctx.energonHeight || "UNKNOWN",
    tickState: ctx.tickState || "UNKNOWN",
    burnState: ctx.burnState || "UNKNOWN",
    halvingState: ctx.halvingState || "UNKNOWN",
    protocolEra: ctx.protocolEra || "UNKNOWN",
  };
}

export function shouldUseSpecialist(reasoning = {}) {
  return ["builder", "observe", "community", "explore"].includes(
    reasoning.primarySpecialist
  );
}
