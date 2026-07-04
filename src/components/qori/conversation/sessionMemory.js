const SESSION_MEMORY_KEY = "energon_qori_session_memory_v1";

function normalize(input = "") {
  return String(input).toLowerCase().trim().replace(/\s+/g, " ");
}

export function detectConversationTopic(input = "") {
  const q = normalize(input);

  if (
    q.includes("build") ||
    q.includes("code") ||
    q.includes("dashboard") ||
    q.includes("frontend") ||
    q.includes("test")
  ) {
    return "builder";
  }

  if (
    q.includes("community") ||
    q.includes("twitter") ||
    q.includes("discord") ||
    q.includes("post")
  ) {
    return "community";
  }

  if (
    q.includes("explore") ||
    q.includes("discover") ||
    q.includes("learn") ||
    q.includes("curious")
  ) {
    return "explore";
  }

  if (
    q.includes("verify") ||
    q.includes("doubt") ||
    q.includes("confirm") ||
    q.includes("check")
  ) {
    return "verification";
  }

  if (
    q.includes("purpose") ||
    q.includes("mission") ||
    q.includes("meaning") ||
    q.includes("why")
  ) {
    return "purpose";
  }

  return "";
}

export function rememberConversationTopic(input = "") {
  if (typeof window === "undefined") return "";

  const topic = detectConversationTopic(input);
  if (!topic) return "";

  try {
    localStorage.setItem(
      SESSION_MEMORY_KEY,
      JSON.stringify({
        topic,
        updatedAt: Date.now(),
      })
    );
  } catch {}

  return topic;
}

export function readConversationTopic() {
  if (typeof window === "undefined") return "";

  try {
    const raw = localStorage.getItem(SESSION_MEMORY_KEY);
    if (!raw) return "";

    const parsed = JSON.parse(raw);
    if (!parsed?.topic || !parsed?.updatedAt) return "";

    const age = Date.now() - Number(parsed.updatedAt);

    // Forget after 30 minutes.
    if (age > 1000 * 60 * 30) {
      localStorage.removeItem(SESSION_MEMORY_KEY);
      return "";
    }

    return parsed.topic;
  } catch {
    return "";
  }
}

export function clearConversationTopic() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(SESSION_MEMORY_KEY);
  } catch {}
}