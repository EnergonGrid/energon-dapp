import React, { useMemo } from "react";

/**
 * ReserveBar (color-only)
 * - Shows label + a health bar
 * - NO raw numbers (per your request)
 * - Health = clamp(current / min, 0..2) mapped to red->amber->green
 */
export default function ReserveBar({ label, current, min }) {
  const health = useMemo(() => {
    try {
      const c = BigInt(current ?? 0);
      const m = BigInt(min ?? 0);
      if (m <= 0n) return 0;
      // scale to 1e6 for precision in JS without floats
      const scaled = Number((c * 1_000_000n) / m) / 1_000_000;
      if (!Number.isFinite(scaled)) return 0;
      // clamp 0..2 (200% max display)
      return Math.max(0, Math.min(2, scaled));
    } catch {
      return 0;
    }
  }, [current, min]);

  const pct = Math.round((health / 2) * 100); // 0..100 display percent
  const tone = health >= 1 ? "good" : health >= 0.6 ? "warn" : "bad";

  return (
    <div style={ui.wrap}>
      <div style={ui.top}>
        <div style={ui.label}>{label}</div>
        {/* no numbers on purpose */}
      </div>

      <div style={ui.track}>
        <div
          style={{
            ...ui.fill,
            width: `${pct}%`,
            ...(tone === "good"
              ? ui.fillGood
              : tone === "warn"
              ? ui.fillWarn
              : ui.fillBad),
          }}
        />
        <div style={ui.glass} />
      </div>
    </div>
  );
}

const ui = {
  wrap: { marginTop: 12 },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  label: { fontWeight: 900, letterSpacing: 0.4, opacity: 0.92 },

  track: {
    position: "relative",
    marginTop: 8,
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    borderRadius: 999,
    transition: "width 180ms linear",
  },
  fillBad: {
    background:
      "linear-gradient(90deg, rgba(255,80,80,0.95), rgba(255,120,80,0.90))",
    boxShadow: "0 0 18px rgba(255,80,80,0.25)",
  },
  fillWarn: {
    background:
      "linear-gradient(90deg, rgba(255,170,60,0.95), rgba(255,220,90,0.90))",
    boxShadow: "0 0 18px rgba(255,170,60,0.20)",
  },
  fillGood: {
    background:
      "linear-gradient(90deg, rgba(80,255,170,0.95), rgba(120,255,210,0.85))",
    boxShadow: "0 0 18px rgba(80,255,170,0.22)",
  },
  glass: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.00))",
    pointerEvents: "none",
  },
};