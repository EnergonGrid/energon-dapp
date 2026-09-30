export function normalizeText(input = "") {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesPhrase(input = "", phrase = "") {
  const q = normalizeText(input);
  const normalizedPhrase = normalizeText(phrase);

  if (!q || !normalizedPhrase) return false;

  if (q === normalizedPhrase) return true;

  const escaped = normalizedPhrase.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  return new RegExp(
    `(^|[^a-z0-9])${escaped}($|[^a-z0-9])`,
    "i"
  ).test(q);
}

export function hasAnyPhrase(input = "", phrases = []) {
  return phrases.some((phrase) => matchesPhrase(input, phrase));
}
