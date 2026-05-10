export function stopTyping(ref) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

export function typeText(text, setText, speed = 32, onDone) {
  let i = 0;
  setText("");

  function step() {
    i += 1;
    setText(text.slice(0, i));

    if (i >= text.length) {
      if (onDone) onDone();
      return;
    }

    const current = text[i] || "";
    const prev = text[i - 1] || "";

    let delay = speed;

    if (current === "\n") delay += 130;
    if (prev === ".") delay += 160;
    if (prev === "…") delay += 120;
    if (Math.random() < 0.035) delay += 220;

    return setTimeout(step, delay);
  }

  return setTimeout(step, speed);
}

export function maybeAddSignalDegradation(text) {
  if (Math.random() > 0.18) return text;

  return `SIGNAL DRIFT...\n...\nRecovered.\n\n${text}`;
}
