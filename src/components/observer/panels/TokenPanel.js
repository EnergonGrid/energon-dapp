import React from "react";

export default function TokenPanel({
  mode,
  tokenPanelOpen,
  setTokenPanelOpen,
  isBound,
  tokenIdStr,
  rarityLabel,
  displayedCandidateId,
  isGenesis,
  manualTokenId,
  setManualTokenId,
  setManualTouched,
  manualTokenIdValid,
  ownershipMsg,
  derivedTokenId,
  loadingMeta,
  metaErr,
  meta,
}) {
  if (mode !== "COHERENT") return null;

  const collapsed = !tokenPanelOpen && isBound;

  return (
    <div
      style={{
        marginTop: 9,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingTop: 9,
      }}
    >
      {collapsed ? (
        <button
          onClick={() => setTokenPanelOpen(true)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "8px 10px",
            borderRadius: 13,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.16)",
            color: "white",
            cursor: "pointer",
          }}
          title="Click to expand token section"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.93 }}>
              Token ID:{" "}
              <span style={{ fontWeight: 700, opacity: 0.98 }}>{tokenIdStr}</span>
              {isGenesis ? (
                <span style={{ marginLeft: 7, opacity: 0.72 }}>(Genesis)</span>
              ) : null}
            </div>

            <div style={{ fontSize: 12, opacity: 0.93 }}>
              Rarity:{" "}
              <span style={{ fontWeight: 700, opacity: 0.98 }}>{rarityLabel}</span>
            </div>
          </div>
        </button>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.84 }}>
              Token ID:{" "}
              <span style={{ opacity: 0.98, fontWeight: 600 }}>
                {displayedCandidateId}
              </span>
              {isGenesis ? (
                <span style={{ marginLeft: 8, opacity: 0.72 }}>(Genesis)</span>
              ) : null}
            </div>

            <div style={{ fontSize: 12, opacity: 0.84 }}>
              Rarity:{" "}
              <span style={{ opacity: 0.98, fontWeight: 600 }}>
                {isBound ? rarityLabel : "—"}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 9 }}>
            <div
              style={{
                fontSize: 12,
                opacity: 0.72,
                marginBottom: 7,
              }}
            >
              Token ID (loads only if owned):
            </div>

            <input
              value={manualTokenId}
              onChange={(e) => {
                setManualTouched(true);
                setManualTokenId(e.target.value);
              }}
              inputMode="numeric"
              placeholder="e.g. 1"
              style={{
                width: "100%",
                padding: "9px 11px",
                borderRadius: 12,
                border:
                  manualTokenId && !manualTokenIdValid
                    ? "1px solid rgba(255,70,70,0.65)"
                    : "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.25)",
                color: "white",
                outline: "none",
                boxSizing: "border-box",
                fontSize: 13,
              }}
            />

            {manualTokenId && !manualTokenIdValid ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  opacity: 0.78,
                  color: "#ff8a3d",
                }}
              >
                Digits only.
              </div>
            ) : null}

            {ownershipMsg ? (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: ownershipMsg.color,
                  opacity: 0.96,
                }}
              >
                {ownershipMsg.text}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 9, fontSize: 12, opacity: 0.76 }}>
            Metadata:{" "}
            {derivedTokenId == null
              ? "—"
              : loadingMeta
              ? "Loading…"
              : metaErr
              ? <span style={{ color: "#ff8a3d" }}>{metaErr}</span>
              : meta
              ? "OK"
              : "—"}
          </div>

          {isBound ? (
            <div style={{ marginTop: 9 }}>
              <button
                onClick={() => setTokenPanelOpen(false)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Collapse
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}