import React from "react";
import StatusPill from "../ui/StatusPill";
import TokenPanel from "./TokenPanel";

export default function ObserverHud({
  hudOpen,
  setHudOpen,
  mode,
  isConnected,
  address,
  connect,
  disconnect,
  viewMode,
  setViewMode,
  cubeCount,
  cubeN,
  eonText,
  beat,
  isBound,
  totalMintedN,
  tokenPanelOpen,
  setTokenPanelOpen,
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
  shortAddr,
}) {
  const activeViewButtonStyle = {
    background: "rgba(255,210,90,0.18)",
    border: "1px solid rgba(255,210,90,0.55)",
    boxShadow:
      "0 0 0 1px rgba(255,210,90,0.18), 0 0 16px rgba(255,210,90,0.22), inset 0 0 14px rgba(255,210,90,0.16)",
    transform: "scale(1.02)",
    animation: "guardianViewPulse 1.8s ease-in-out infinite",
  };

  const inactiveViewButtonStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "none",
    transform: "scale(1)",
  };

  const viewButtonBase = {
    padding: "6px 14px",
    borderRadius: 999,
    color: "white",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    opacity: 0.97,
    transition: "all 180ms ease",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 18,
        left: 18,
        zIndex: 20,
        width: 390,
        maxWidth: "calc(100vw - 36px)",
        fontFamily: "ui-sans-serif, system-ui",
        lineHeight: 1.2,
        pointerEvents: "auto",
      }}
    >
      {/* ✅ pulse keyframes added */}
      <style>{`
  @keyframes guardianViewPulse {
    0% {
      box-shadow:
        0 0 0 1px rgba(255,210,90,0.18),
        0 0 10px rgba(255,210,90,0.14),
        inset 0 0 8px rgba(255,210,90,0.10);
    }
    50% {
      box-shadow:
        0 0 0 1px rgba(255,210,90,0.30),
        0 0 22px rgba(255,210,90,0.34),
        inset 0 0 18px rgba(255,210,90,0.22);
    }
    100% {
      box-shadow:
        0 0 0 1px rgba(255,210,90,0.18),
        0 0 10px rgba(255,210,90,0.14),
        inset 0 0 8px rgba(255,210,90,0.10);
    }
  }
`}</style>

      <div>
        <button
          onClick={() => setHudOpen((v) => !v)}
          title={hudOpen ? "Collapse HUD" : "Expand HUD"}
          style={{
            padding: 0,
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div
            style={{
              letterSpacing: "0.22em",
              fontSize: 12,
              opacity: 0.82,
              fontWeight: 600,
            }}
          >
            GUARDIAN OBSERVER
          </div>
        </button>

        {hudOpen ? (
          <>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setHudOpen((v) => !v)}
                title="Collapse HUD"
                style={{
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "white",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  Energon
                </span>

                <StatusPill mode={mode} />

                <span style={{ opacity: 0.7, fontSize: 12 }}>▴</span>
              </button>
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setViewMode("CUBE")}
                title="Cube view"
                style={{
                  ...viewButtonBase,
                  ...(viewMode === "CUBE"
                    ? activeViewButtonStyle
                    : inactiveViewButtonStyle),
                }}
              >
                CUBE
              </button>

              <button
                onClick={() => setViewMode("GRID")}
                title="Grid view"
                style={{
                  ...viewButtonBase,
                  ...(viewMode === "GRID"
                    ? activeViewButtonStyle
                    : inactiveViewButtonStyle),
                }}
              >
                GRID
              </button>
            </div>
          </>
        ) : null}
      </div>

      {hudOpen ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 16,
            padding: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 11, opacity: 0.65, letterSpacing: "0.08em" }}>
                WALLET
              </div>
              <div style={{ marginTop: 5, fontSize: 13, opacity: 0.95 }}>
                {isConnected ? shortAddr(address) : "Not connected"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, opacity: 0.65, letterSpacing: "0.08em" }}>
                CUBE COUNT
              </div>
              <div style={{ marginTop: 5, fontSize: 13, opacity: 0.95 }}>
                {cubeCount?.isLoading ? "…" : String(cubeN)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, opacity: 0.65, letterSpacing: "0.08em" }}>
                EON BALANCE
              </div>
              <div style={{ marginTop: 5, fontSize: 13, opacity: 0.95 }}>
                {isConnected ? eonText : "—"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, opacity: 0.65, letterSpacing: "0.08em" }}>
                HEARTBEAT
              </div>
              <div style={{ marginTop: 5, fontSize: 13, opacity: 0.95 }}>
                {mode === "COHERENT" ? (isBound ? beat : "—") : beat}
              </div>
            </div>
          </div>

          <TokenPanel
            mode={mode}
            tokenPanelOpen={tokenPanelOpen}
            setTokenPanelOpen={setTokenPanelOpen}
            isBound={isBound}
            tokenIdStr={tokenIdStr}
            rarityLabel={rarityLabel}
            displayedCandidateId={displayedCandidateId}
            isGenesis={isGenesis}
            manualTokenId={manualTokenId}
            setManualTokenId={setManualTokenId}
            setManualTouched={setManualTouched}
            manualTokenIdValid={manualTokenIdValid}
            ownershipMsg={ownershipMsg}
            derivedTokenId={derivedTokenId}
            loadingMeta={loadingMeta}
            metaErr={metaErr}
            meta={meta}
          />
        </div>
      ) : null}
    </div>
  );
}