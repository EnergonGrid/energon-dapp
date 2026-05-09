export function readQoriMemory() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem("qori_memory");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function writeQoriMemory(memory = {}) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem("qori_memory", JSON.stringify(memory));
  } catch {}
}

export function detectMemoryInput(input = "") {
  const q = input.trim();

  const nameMatch =
    q.match(/my name is\s+([a-zA-Z0-9’'\- ]{2,40})/i) ||
    q.match(/call me\s+([a-zA-Z0-9’'\- ]{2,40})/i);

  if (nameMatch) {
    return {
      key: "name",
      value: nameMatch[1].trim(),
    };
  }

  return null;
}
