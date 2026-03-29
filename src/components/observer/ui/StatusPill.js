import React from "react";

export default function StatusPill({ mode }) {
  const map = {
    DISCONNECTED: {
      text: "DISCONNECTED",
      bg: "rgba(255,255,255,0.06)",
      br: "rgba(255,255,255,0.18)",
    },
    SILENT: {
      text: "SILENT",
      bg: "rgba(80,120,190,0.10)",
      br: "rgba(80,120,190,0.28)",
    },
    COHERENT: {
      text: "COHERENT",
      bg: "rgba(55,183,255,0.12)",
      br: "rgba(55,183,255,0.35)",
    },
    FRACTURED: {
      text: "FRACTURED",
      bg: "rgba(255,70,70,0.14)",
      br: "rgba(255,70,70,0.40)",
    },
  };

  const s = map[mode] || map.DISCONNECTED;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${s.br}`,
        background: s.bg,
        fontSize: 11,
        letterSpacing: "0.14em",
        opacity: 0.95,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.55)",
        }}
      />
      {s.text}
    </span>
  );
}
