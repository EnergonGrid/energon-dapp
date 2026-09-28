const GUARDIAN_MEMORY_KEY = "energon_qori_guardian_memory_v2";

export function walletMemoryKey(namespace, address = "") {
  const normalized = String(address).toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(normalized) ? `${namespace}:14:${normalized}` : "";
}

export function readGuardianMemory(address) {
  const key = walletMemoryKey(GUARDIAN_MEMORY_KEY, address);
  if (!key || typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(key) || "{}") || {}; }
  catch { return {}; }
}

export function writeGuardianMemory(address, memory) {
  const key = walletMemoryKey(GUARDIAN_MEMORY_KEY, address);
  if (!key || typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(memory)); } catch {}
}
