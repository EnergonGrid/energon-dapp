const SESSION_MEMORY_KEY = "energon_qori_session_memory_v2";

function conversationMemoryKey(walletAddress) {
  const address = String(walletAddress || "").trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) return null;
  return `${SESSION_MEMORY_KEY}:14:${address}`;
}

import {
  normalizeText as normalize,
  hasAnyPhrase,
} from "./matchUtils";

export function detectConversationTopic(input = "") {
  const q = normalize(input);

  if (
    hasAnyPhrase(q, [
      "build",
      "code",
      "dashboard",
      "frontend",
      "test",
    ])
  ) {
    return "builder";
  }

  if (
    hasAnyPhrase(q, [
      "community",
      "twitter",
      "discord",
      "post",
    ])
  ) {
    return "community";
  }

  if (
    hasAnyPhrase(q, [
      "explore",
      "discover",
      "learn",
      "curious",
    ])
  ) {
    return "explore";
  }

  if (
    hasAnyPhrase(q, [
      "verify",
      "doubt",
      "confirm",
      "check",
    ])
  ) {
    return "verification";
  }

  if (
    hasAnyPhrase(q, [
      "purpose",
      "mission",
      "meaning",
      "why",
    ])
  ) {
    return "purpose";
  }

  return "";
}

export function rememberConversationTopic(input = "", walletAddress) {
  if (typeof window === "undefined") return "";
  const key = conversationMemoryKey(walletAddress);
  if (!key) return "";

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

export function readConversationTopic(walletAddress) {
  if (typeof window === "undefined") return "";
  const key = conversationMemoryKey(walletAddress);
  if (!key) return "";

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
