export function stopTyping(ref) {
  if (!ref?.current) return;

  if (typeof ref.current.stop === "function") {
    ref.current.stop();
    ref.current = null;
    return;
  }

  clearTimeout(ref.current);
  ref.current = null;
}

export function typeText(text, setText, speed = 32, onDone) {
  let i = 0;
  let timer = null;
  let cancelled = false;

  setText("");

  function step() {
    if (cancelled) return;

    i += 1;
    setText(text.slice(0, i));

    if (i >= text.length) {
      if (!cancelled && typeof onDone === "function") onDone();
      return;
    }

    const current = text[i] || "";
    const prev = text[i - 1] || "";

    let delay = speed;

    if (current === "\n") delay += 130;
    if (prev === ".") delay += 160;
    if (prev === "…") delay += 120;
    if (Math.random() < 0.035) delay += 220;

    timer = setTimeout(step, delay);
  }

  timer = setTimeout(step, speed);

  return {
    stop() {
      cancelled = true;
      if (timer) clearTimeout(timer);
    },
  };
}

export function maybeAddSignalDegradation(text = "") {
  if (!text) return "";
  if (Math.random() > 0.18) return text;

  return `SIGNAL DRIFT

Transmission interrupted.

Signal recovered.

${text}`;
}