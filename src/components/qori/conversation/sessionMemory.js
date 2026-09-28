import { walletMemoryKey } from "../qoriMemory";
const SESSION_MEMORY_KEY = "energon_qori_session_memory_v2";

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

export function rememberConversationTopic(input = "", address = "") {
  const key = walletMemoryKey(SESSION_MEMORY_KEY, address);
  if (!key || typeof window === "undefined") return "";

  const topic = detectConversationTopic(input);
  if (!topic) return "";

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        topic,
        updatedAt: Date.now(),
      })
    );
  } catch {}

  return topic;
}

export function readConversationTopic(address = "") {
  const key = walletMemoryKey(SESSION_MEMORY_KEY, address);
  if (!key || typeof window === "undefined") return "";

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return "";

    const parsed = JSON.parse(raw);
    if (!parsed?.topic || !parsed?.updatedAt) return "";

    const age = Date.now() - Number(parsed.updatedAt);

    // Forget after 30 minutes.
    if (age > 1000 * 60 * 30) {
      localStorage.removeItem(key);
      return "";
    }

    return parsed.topic;
  } catch {
    return "";
  }
}

export function clearConversationTopic(address = "") {
  const key = walletMemoryKey(SESSION_MEMORY_KEY, address);
  if (!key || typeof window === "undefined") return;

  try {
    localStorage.removeItem(key);
  } catch {}
}