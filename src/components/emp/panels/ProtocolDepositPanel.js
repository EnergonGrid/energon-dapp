import React from "react";
import Panel from "../Panel";

export default function ProtocolDepositPanel({
  ui,
  contribOpen,
  setContribOpen,
  contribReadWrapRef,
  contribReadOpen,
  setContribReadOpen,
  contribReadAccepted,
  contribReadPulse,
  setContribReadAccepted,
  setContribReadPulse,
  setStatus,
  contribAsset,
  setContribAsset,
  contributionOptions,
  contribAmt,
  setContribAmt,
  depositLocked,
  onContribute,
}) {
  return (
    <Panel title="Protocol Deposit" subtitle="Direct state input into the Vault">
      <div style={ui.contribWrap}>
        <button
          onClick={() => setContribOpen((x) => !x)}
          style={ui.contribHead}
          type="button"
        >
          <div>
            <div style={ui.contribTitle}>Protocol Deposit</div>
            <div style={ui.contribSub}>Direct state input into the Vault</div>
          </div>
          <div style={ui.contribChev}>{contribOpen ? "▾" : "▸"}</div>
        </button>

        {contribOpen ? (
          <div style={ui.contribBody}>
            <div style={ui.readRow} ref={contribReadWrapRef}>
              <span style={{ fontWeight: 950 }}>Read before depositing</span>{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setContribReadOpen((x) => !x);
                }}
                style={ui.readLink}
                aria-expanded={contribReadOpen}
              >
                (read)
              </button>

              {!contribReadAccepted ? (
                <span style={ui.readLockPill}>LOCKED</span>
              ) : (
                <span style={ui.readReadyPill}>ACKNOWLEDGED</span>
              )}

              {contribReadOpen ? (
                <div
                  style={{
                    ...ui.readPopover,
                    ...(contribReadPulse ? ui.readPopoverPulse : null),
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={ui.readPopoverTitle}>Protocol Deposit</div>

                  <div style={ui.readPopoverText}>
                    Value sent to the Vault becomes protocol state.
                    <br />
                    <br />
                    It is not owed, not reserved, and not attributable to any participant.
                    <br />
                    <br />
                    This action does not initiate a swap, does not create a claim, and does
                    not produce deterministic output.
                    <br />
                    <br />
                    This is not a contribution. It is a state transition.
                    <br />
                    <br />
                    FBTC, FLTC, and FDOGE remain inactive until enabled.
                  </div>

                  <div style={ui.readAcknowledgeBox}>
                    <button
                      type="button"
                      onClick={() => {
                        setContribReadAccepted((x) => !x);
                        setContribReadPulse(false);
                      }}
                      style={{
                        ...ui.ackToggle,
                        ...(contribReadAccepted ? ui.ackToggleOn : ui.ackToggleOff),
                      }}
                      aria-pressed={contribReadAccepted}
                    >
                      <span
                        style={{
                          ...ui.ackGlyph,
                          ...(contribReadAccepted ? ui.ackGlyphOn : null),
                        }}
                      >
                        ◇
                      </span>
                      <span style={ui.ackText}>
                        I acknowledge this is a one-way protocol deposit into Vault state.
                      </span>
                    </button>

                    <div style={ui.readActions}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!contribReadAccepted) {
                            setContribReadPulse(true);
                            setStatus("Acknowledge protocol deposit before continuing.");
                            return;
                          }
                          setContribReadOpen(false);
                          setStatus("Protocol deposit acknowledged.");
                        }}
                        style={{
                          ...ui.btnPrimary,
                          opacity: contribReadAccepted ? 1 : 0.5,
                          cursor: contribReadAccepted ? "pointer" : "not-allowed",
                        }}
                      >
                        Open Deposit Access
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ height: 10 }} />

            <div
              style={{
                ...ui.contribRow,
                opacity: depositLocked ? 0.45 : 1,
                filter: depositLocked ? "saturate(0.8)" : "none",
              }}
            >
              <select
                value={contribAsset}
                onChange={(e) => setContribAsset(e.target.value)}
                style={ui.select}
                disabled={depositLocked}
              >
                {contributionOptions.map((opt) => (
                  <option key={opt.key} value={opt.key} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <input
                value={contribAmt}
                onChange={(e) => setContribAmt(e.target.value)}
                style={ui.input}
                placeholder={depositLocked ? "acknowledge to unlock" : "amount"}
                disabled={depositLocked}
              />

              <button
                onClick={onContribute}
                style={{
                  ...ui.btnPrimary,
                  opacity:
                    depositLocked || !String(contribAmt || "").trim() ? 0.5 : 1,
                  cursor:
                    depositLocked || !String(contribAmt || "").trim()
                      ? "not-allowed"
                      : "pointer",
                }}
                disabled={depositLocked || !String(contribAmt || "").trim()}
                type="button"
              >
                Commit to State
              </button>
            </div>

            <div style={ui.footnote}>
              Deposits increase Vault reserves and influence system state.
            </div>

            <div style={{ ...ui.footnote, marginTop: 6 }}>
              No claim is created. No output is generated.
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}