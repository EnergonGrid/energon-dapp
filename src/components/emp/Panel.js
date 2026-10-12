import React from "react";

export default function Panel({ title, subtitle, children }) {
  return (
    <div style={ui.panel}>
      <div style={ui.head}>
        <div>
          <div style={ui.title}>{title}</div>
          {subtitle ? <div style={ui.subtitle}>{subtitle}</div> : null}
        </div>
      </div>
      <div style={ui.content}>{children}</div>
    </div>
  );
}

const ui = {
  panel: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.35) inset",
    overflow: "hidden",
  },
  head: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  title: { fontWeight: 900, opacity: 0.92 },
  subtitle: { fontSize: 12, opacity: 0.65, marginTop: 4 },
  content: { padding: 14 },
};