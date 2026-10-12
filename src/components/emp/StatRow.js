import React from "react";

export default function StatRow({ label, value }) {
  return (
    <div style={ui.row}>
      <div style={ui.label}>{label}</div>
      <div style={ui.value}>{value}</div>
    </div>
  );
}

const ui = {
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  label: { opacity: 0.75 },
  value: { fontWeight: 800, opacity: 0.95, textAlign: "right" },
};
