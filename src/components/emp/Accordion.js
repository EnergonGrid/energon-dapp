import React from "react";

export default function Accordion({ title, subtitle, open, onToggle, children }) {
  return (
    <div style={ui.wrap}>
      <button onClick={onToggle} style={ui.head}>
        <div>
          <div style={ui.title}>{title}</div>
          <div style={ui.sub}>{subtitle}</div>
        </div>
        <div style={ui.chev}>{open ? "▾" : "▸"}</div>
      </button>

      {open ? <div style={ui.body}>{children}</div> : null}
    </div>
  );
}

const ui = {
  wrap: {
    borderRadius: 16,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  head: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    background: "rgba(255,255,255,0.02)",
    color: "rgba(255,255,255,0.95)",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  title: { fontWeight: 900, opacity: 0.92 },
  sub: { fontSize: 12, opacity: 0.65, marginTop: 4 },
  chev: { fontSize: 16, opacity: 0.8, fontWeight: 900 },
  body: { padding: 14 },
};
