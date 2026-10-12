import React from "react";

export default function PastClaimsPanel({
  ui,
  pastClaimsOpen,
  setPastClaimsOpen,
  pastClaimsBusy,
  syncPastClaimsForWallet,
  claimLookbackBlocks,
  setClaimLookbackBlocks,
  lastPastClaimsSync,
  pastClaimsNote,
  pastClaims,
  badgeStyle,
  dirLabel,
  formatUnitsSafe,
  usdt0Decimals,
  eonDecimals,
  formatUnixTs,
  onExpireById,
}) {
  return (
    <div style={ui.claimBox}>
      <button
        type="button"
        onClick={() => setPastClaimsOpen((x) => !x)}
        style={ui.contribHead}
      >
        <div>
          <div style={ui.contribTitle}>Past Claims</div>
          <div style={ui.contribSub}>
            Claimed + expired history · scroll for more
          </div>
        </div>
        <div style={ui.contribChev}>{pastClaimsOpen ? "▾" : "▸"}</div>
      </button>

      {pastClaimsOpen ? (
        <div style={ui.contribBody}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={ui.btnGhost}
              disabled={pastClaimsBusy}
              onClick={syncPastClaimsForWallet}
            >
              {pastClaimsBusy ? "Syncing…" : "Sync Past"}
            </button>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                Lookback blocks
              </div>
              <input
                value={String(claimLookbackBlocks)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = Number(raw);
                  if (!Number.isFinite(n)) return;
                  const clamped = Math.max(1, Math.min(Math.floor(n), 5_000_000));
                  setClaimLookbackBlocks(clamped);
                }}
                style={{ ...ui.input, marginTop: 0, maxWidth: 180 }}
                placeholder="200000"
              />
            </div>
          </div>

          {lastPastClaimsSync ? (
            <div style={ui.footnote}>
              last sync: {new Date(lastPastClaimsSync).toLocaleTimeString()}
            </div>
          ) : null}

          {pastClaimsNote ? (
            <div style={ui.footnote}>{pastClaimsNote}</div>
          ) : null}

          {!pastClaims.length && !pastClaimsNote ? (
            <div style={ui.footnote}>No claimed or expired history for this wallet.</div>
          ) : null}

          {pastClaims.length ? (
            <div
              style={{
                marginTop: 10,
                maxHeight: 260,
                overflowY: "auto",
                display: "grid",
                gap: 10,
              }}
            >
              {pastClaims.map((c) => {
                const badgeUi = badgeStyle(c.expired ? "EXPIRED" : "READY");
                const badgeText = c.expired ? "EXPIRED" : "CLAIMED";

                const inLabel =
                  c.direction === 0 || c.direction === 0n
                    ? "USDT0 in (received)"
                    : "EON in (received)";
                const outLabel =
                  c.direction === 0 || c.direction === 0n
                    ? "EON out (net)"
                    : "USDT0 out (net)";

                const inVal =
                  c.direction === 0 || c.direction === 0n
                    ? formatUnitsSafe(c.inAmount ?? 0n, usdt0Decimals)
                    : formatUnitsSafe(c.inAmount ?? 0n, eonDecimals);

                const outVal =
                  c.direction === 0 || c.direction === 0n
                    ? formatUnitsSafe(c.outAmountNet ?? 0n, eonDecimals)
                    : formatUnitsSafe(c.outAmountNet ?? 0n, usdt0Decimals);

                return (
                  <div key={c.id.toString()} style={ui.claimRowCard}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 900, opacity: 0.95 }}>
                        #{c.id.toString()} · {dirLabel(c.direction)}
                      </div>
                      <div style={badgeUi}>{badgeText}</div>
                    </div>

                    <div style={ui.claimMeta}>
                      <div style={ui.claimMetaRow}>
                        <span style={ui.claimK}>{inLabel}</span>
                        <span style={ui.claimV}>{inVal}</span>
                      </div>
                      <div style={ui.claimMetaRow}>
                        <span style={ui.claimK}>{outLabel}</span>
                        <span style={ui.claimV}>{outVal}</span>
                      </div>
                      <div style={ui.claimMetaRow}>
                        <span style={ui.claimK}>unlock at</span>
                        <span style={ui.claimV}>
                          {formatUnixTs(c.unlockTime)}
                        </span>
                      </div>
                      <div style={ui.claimMetaRow}>
                        <span style={ui.claimK}>expiry at</span>
                        <span style={ui.claimV}>
                          {formatUnixTs(c.expiryTime)}
                        </span>
                      </div>
                    </div>

                    {c.needsCleanup ? (
                      <button
                        type="button"
                        onClick={() => onExpireById(c.id)}
                        disabled={pastClaimsBusy}
                        style={{ ...ui.btnGhost, marginTop: 10 }}
                      >
                        Cleanup Expiry
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}