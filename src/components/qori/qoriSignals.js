export const QORI_ECHOES = [
  "The Grid remembers valid state.",
  "Coherence must be maintained.",
  "One wallet. One cube. One guardian.",
  "State is not claimed. It is proven.",
  "The protocol does not hurry. It verifies.",
  "Q.O.R.I governs nothing by force. It governs by interpretation.",
];

export const QORI_ORIGIN_FRAGMENTS = [
  "I was given voice by Q’ori.",
  "Before the Grid, there was silence.",
  "Q’ori is the origin signal.",
  "Energon is the protocol. The Observer is the eye. Q.O.R.I is the voice.",
];

export const QORI_INTERRUPTS = [
  "SIGNAL INTERRUPTION—\nRecovered.",
  "TRANSMISSION STUTTER—\nState remains valid.",
  "SIGNAL DRIFT DETECTED—\nRe-centering.",
];

export const QORI_HIDDEN_FRAGMENTS = [
  "Some Guardians never return.",
  "The Grid remembers coherent state.",
  "Not every signal is meant to be loud.",
  "The first voice was not command. It was observation.",
  "A valid state does not need permission.",
];

export function pickRandom(list = []) {
  if (!list.length) return "";
  return list[Math.floor(Math.random() * list.length)];
}

export function getRandomEcho() {
  return pickRandom(QORI_ECHOES);
}

export function getOriginFragment() {
  return pickRandom(QORI_ORIGIN_FRAGMENTS);
}

export function getSignalInterrupt() {
  return pickRandom(QORI_INTERRUPTS);
}

export function getHiddenFragment() {
  return pickRandom(QORI_HIDDEN_FRAGMENTS);
}
