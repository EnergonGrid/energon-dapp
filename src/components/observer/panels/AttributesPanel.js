import React from "react";
import AttrTileSmall from "../ui/AttrTileSmall";

export default function AttributesPanel({
  canShowAttributes,
  isNarrow,
  attrsOpen,
  setAttrsOpen,
  attrsCapped,
  maxAttrs,
  sheetInset,
  sheetH,
  sheetCollapsedH,
  attrPanelInset,
  attrPanelW,
  attrPanelMaxH,
  attrCollapsedH,
  attrPanelGap,
}) {
  if (!canShowAttributes) return null;

  return (
    <div
      style={
        isNarrow
          ? {
              position: "absolute",
              left: sheetInset,
              right: sheetInset,
              bottom: sheetInset,
              height: attrsOpen ? sheetH : sheetCollapsedH,
              zIndex: 22,
              padding: 12,
              boxSizing: "border-box",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 18,
              background: "rgba(7,10,18,0.92)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              fontFamily: "ui-sans-serif, system-ui",
              lineHeight: 1.25,
              overflow: "hidden",
              pointerEvents: "auto",
              display: "flex",
              flexDirection: "column",
              transition: "height 220ms ease",
            }
          : {
              position: "absolute",
              right: attrPanelInset,
              bottom: attrPanelInset,
              width: attrPanelW,
              height: attrsOpen ? attrPanelMaxH : attrCollapsedH,
              zIndex: 22,
              padding: 12,
              boxSizing: "border-box",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 18,
              background: "rgba(7,10,18,0.92)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              fontFamily: "ui-sans-serif, system-ui",
              lineHeight: 1.25,
              overflow: "hidden",
              pointerEvents: "auto",
              transition: "height 220ms ease",
            }
      }
    >
      <button
        onClick={() => setAttrsOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          padding: 0,
          border: "none",
          background: "transparent",
          color: "white",
          cursor: "pointer",
          textAlign: "left",
        }}
        title={attrsOpen ? "Collapse attributes" : "Expand attributes"}
      >
        <div
          style={{
            fontSize: 12,
            opacity: 0.85,
            letterSpacing: "0.10em",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          ATTRIBUTES{" "}
          <span style={{ opacity: 0.65, fontSize: 12 }}>
            {attrsOpen ? "▴" : "▾"}
          </span>
        </div>
        <div style={{ fontSize: 10, opacity: 0.6 }}>
          {attrsOpen ? `Showing ${attrsCapped.length}/${maxAttrs}` : null}
        </div>
      </button>

      {attrsOpen ? (
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: attrPanelGap,
            overflow: "hidden",
            alignContent: "start",
            flex: 1,
          }}
        >
          {attrsCapped.map((a, idx) => {
            const k = a?.trait_type ?? a?.traitType ?? `Attribute ${idx + 1}`;
            const v = a?.value;
            return <AttrTileSmall key={`${k}-${idx}`} k={k} v={v} />;
          })}
        </div>
      ) : null}
    </div>
  );
}
