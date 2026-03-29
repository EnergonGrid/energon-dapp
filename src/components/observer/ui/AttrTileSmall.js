import React from "react";

export default function AttrTileSmall({ k, v }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: "7px 9px",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 10,
          opacity: 0.68,
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {k}
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 12,
          opacity: 0.92,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {String(v ?? "—")}
      </div>
    </div>
  );
}
