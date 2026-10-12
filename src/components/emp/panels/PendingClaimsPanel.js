// src/components/emp/panels/PendingClaimsPanel.js
import React from "react";

function toBigIntSafe(v, fallback = 0n) {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(Math.trunc(v));
    if (typeof v === "string" && v.trim() !== "") return BigInt(v);
    return fallback;
  } catch {
    return fallback;
  }
}

export default function PendingClaimsPanel({
  ui,
  claimsOpen,
  setClaimsOpen,
  claimsBusy,
  syncClaimsForWallet,
  lastClaimsSync,
  claimsNote,
  pendingClaims,
  badgeStyle,
  dirLabel,
  formatUnitsSafe,
  usdt0Decimals,
  eonDecimals,
  formatDurationShort,
  formatUnixTs,
  onClaimById,
  onExpireClaimById,
}) {
  const list = Array.isArray(pendingClaims) ? pendingClaims : [];

  const hasPendingClaims = list.length > 0;
  const hasReadyClaim = list.some((c) => !!c.ready && !c.expired);
  const hasExpiredClaim = list.some((c) => !!c.expired);

  const pendingClaimsBoxStyle = {
    ...ui.claimBox,
    border: hasExpiredClaim
      ? "1px solid rgba(255, 80, 80, 0.50)"
      : hasReadyClaim
      ? "1px solid rgba(255, 210, 90, 0.55)"
      : hasPendingClaims
      ? "1px solid rgba(80, 170, 255, 0.42)"
      : ui.claimBox?.border,
    boxShadow: hasExpiredClaim
      ? "0 0 0 1px rgba(255,80,80,0.10) inset, 0 0 22px rgba(255,80,80,0.15)"
      : hasReadyClaim
      ? "0 0 0 1px rgba(255,220,120,0.10) inset, 0 0 22px rgba(255,210,90,0.18)"
      : hasPendingClaims
      ? "0 0 0 1px rgba(120,190,255,0.10) inset, 0 0 20px rgba(70,150,255,0.16)"
      : ui.claimBox?.boxShadow,
  };

  return (
    <div style={pendingClaimsBoxStyle}>
      <button
        type="button"
        onClick={() => setClaimsOpen((x) => !x)}
        style={ui.contribHead}
      >
        <div>
          <div style={ui.contribTitle}>Pending Claims</div>
          <div style={ui.contribSub}>
            Your unclaimed entries · READY / NOT READY / EXPIRED
          </div>
        </div>
        <div style={ui.contribChev}>{claimsOpen ? "▾" : "▸"}</div>
      </button>

      {claimsOpen ? (
        <div style={ui.contribBody}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={ui.btnGhost}
              disabled={claimsBusy}
              onClick={syncClaimsForWallet}
            >
              {claimsBusy ? "Syncing…" : "Sync Claims"}
            </button>

          </div>

          {lastClaimsSync ? (
            <div style={ui.footnote}>
              last sync: {new Date(lastClaimsSync).toLocaleTimeString()}
            </div>
          ) : null}

          {claimsNote ? <div style={ui.footnote}>{claimsNote}</div> : null}

          {!list.length && !claimsNote ? (
            <div style={ui.footnote}>No pending claims for this wallet.</div>
          ) : null}

          {list.length ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {list.map((c) => {
                const expired = !!c.expired;
                const ready = !!c.ready && !expired;

                const maturityRemaining = toBigIntSafe(c.remainingSec, 0n);
                const expiryRemaining = toBigIntSafe(c.expiryRemainingSec, 0n);

                const badge = expired ? "EXPIRED" : ready ? "READY" : "NOT READY";
                const badgeUi = badgeStyle(expired ? "EXPIRED" : ready ? "READY" : "WAITING");

                const isUsdtToEon = c.direction === 0 || c.direction === 0n;

                const inLabel = isUsdtToEon ? "USDT0 in received" : "EON in received";
                const outLabel = isUsdtToEon ? "EON out net" : "USDT0 out net";

                const inVal = isUsdtToEon
                  ? formatUnitsSafe(c.inAmount ?? 0n, usdt0Decimals)
                  : formatUnitsSafe(c.inAmount ?? 0n, eonDecimals);

                const outVal = isUsdtToEon
                  ? formatUnitsSafe(c.outAmountNet ?? 0n, eonDecimals)
                  : formatUnitsSafe(c.outAmountNet ?? 0n, usdt0Decimals);

                return (
                  <div key={c.id.toString()} style={ui.claimRowCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900, opacity: 0.95 }}>
                        #{c.id.toString()} · {dirLabel(c.direction)}
                      </div>
                      <div style={badgeUi}>{badge}</div>
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
                        <span style={ui.claimK}>matures in</span>
                        <span style={ui.claimV}>
                          {ready || expired ? "0s" : formatDurationShort(maturityRemaining)}
                        </span>
                      </div>

                      <div style={ui.claimMetaRow}>
                        <span style={ui.claimK}>expires in</span>
                        <span style={ui.claimV}>
                          {expired ? "expired" : formatDurationShort(expiryRemaining)}
                        </span>
                      </div>

                      <div style={ui.claimMetaRow}>
                        <span style={ui.claimK}>unlock at</span>
                        <span style={ui.claimV}>{formatUnixTs(c.unlockTime)}</span>
                      </div>

                      <div style={ui.claimMetaRow}>
                        <span style={ui.claimK}>expiry at</span>
                        <span style={ui.claimV}>{formatUnixTs(c.expiryTime)}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => onClaimById(c.id)}
                        disabled={!ready || claimsBusy}
                        style={{
                          ...ui.btnPrimary,
                          opacity: ready ? 1 : 0.5,
                          cursor: ready ? "pointer" : "not-allowed",
                        }}
                      >
                        Claim
                      </button>

                      {expired && typeof onExpireClaimById === "function" ? (
                        <button
                          type="button"
                          onClick={() => onExpireClaimById(c.id)}
                          disabled={claimsBusy}
                          style={ui.btnGhost}
                        >
                          Expire
                        </button>
                      ) : null}
                    </div>
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
