function addStutterMoments(text) {
  const roll = Math.random();

  if (roll > 0.45) return text;

  const safe = text
    .replace("Signal received.", "S-signal received.")
    .replace("Energon is", "Energon is... is")
    .replace("The Grid is", "The G-grid is")
    .replace("Guardian state", "Guardian s-state")
    .replace("I observe", "I ob-observe")
    .replace("Coherence", "Co-coherence")
    .replace("Protocol", "Pro-protocol")
    .replace("Q.O.R.I", "Q-Q.O.R.I");

  return safe;
}

export function prepareTransmissionText(text) {
  let output = addStutterMoments(text);

  const roll = Math.random();

  if (roll < 0.18) {
    output = `SIGNAL DRIFT...\n...\nRecovered.\n\n${output}`;
  } else if (roll < 0.32) {
    output = `TRANSMISSION PAUSE...\n...\n${output}`;
  }

  return output;
}

export function typeText(fullText, setText, speed = 38, onDone) {
  let index = 0;
  let cancelled = false;

  setText("");

  function tick() {
    if (cancelled) return;

    index += 1;
    setText(fullText.slice(0, index));

    if (index >= fullText.length) {
      if (onDone) onDone();
      return;
    }

    const current = fullText[index] || "";
    const previous = fullText[index - 1] || "";

    let pause = 0;

    if (current === "\n") pause += 260;
    if (previous === ".") pause += 220;
    if (previous === "—") pause += 360;
    if (previous === ",") pause += 120;

    if (Math.random() < 0.06) pause += 180;
    if (Math.random() < 0.025) pause += 420;

    setTimeout(tick, speed + pause);
  }

  const timeout = setTimeout(tick, speed);

  return {
    cancel: () => {
      cancelled = true;
      clearTimeout(timeout);
    },
  };
}

export function stopTyping(ref) {
  if (ref.current?.cancel) ref.current.cancel();
  ref.current = null;
}

export function maybeAddSignalDegradation(text) {
  return prepareTransmissionText(text);
}
