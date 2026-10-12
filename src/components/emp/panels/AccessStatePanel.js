import React, { useState } from "react";
import StatRow from "@/components/emp/StatRow";

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

function toBoolSafe(v, fallback = false) {
  return v === undefined || v === null ? fallback : Boolean(v);
}

function MiniSection({ title, subtitle, open, setOpen, children, ui }) {
  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.025)",
          color: "rgba(255,255,255,0.92)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontWeight: 950 }}>{title}</div>
          {subtitle ? <div style={ui.contribSub}>{subtitle}</div> : null}
        </div>
        <div style={{ opacity: 0.75, fontWeight: 950 }}>{open ? "▾" : "▸"}</div>
      </button>

      {open ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}

export default function AccessStatePanel({
  ui,
  accessOpen,
  setAccessOpen,
  v,
  isAddr,
  shortAddr,
  formatUnixTs,
  pendingWithdrawItems = [],
  allWithdrawItems = [],
  nextPendingWithdraw,
  nextWithdrawAmountText,
  nextWithdrawTokenLabel,
  nextWithdrawReadyIn,
  formatDurationShort,
  badgeStyle,
  formatUnitsSafe,
}) {
  const [guardianOpen, setGuardianOpen] = useState(true);
  const [controllerOpen, setControllerOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(pendingWithdrawItems.length > 0);
  const [historyOpen, setHistoryOpen] = useState(false);

  const historyItems = Array.isArray(allWithdrawItems)
    ? allWithdrawItems.filter((w) => w && (w.executed || w.cancelled))
    : [];

  const guardianStatus = Array.isArray(v?.guardianStatus) ? v.guardianStatus : null;
  const canCommit = Array.isArray(v?.canCommit) ? v.canCommit : null;
  const guardianUnlockStatus = Array.isArray(v?.guardianUnlockStatus)
    ? v.guardianUnlockStatus
    : null;

  const cubeBalance = toBigIntSafe(guardianStatus?.[0] ?? v?.cubeBalance ?? 0n);
  const coherent = toBoolSafe(guardianStatus?.[1] ?? v?.isCoherent ?? false);
  const contributionAllowed = toBoolSafe(guardianStatus?.[2] ?? true, true);
  const guardianActionsAllowed = toBoolSafe(guardianStatus?.[3] ?? coherent);
  const userOpenClaims = toBigIntSafe(guardianStatus?.[4] ?? 0n);
  const commitCooldownRemaining = toBigIntSafe(guardianStatus?.[5] ?? 0n);

  const commitAllowed = toBoolSafe(canCommit?.[0] ?? false);
  const commitReason = String(canCommit?.[1] ?? "UNKNOWN");

  const syncedGuardianCount = toBigIntSafe(
    guardianUnlockStatus?.[0] ?? v?.coherentGuardianCount ?? 0n
  );
  const guardianThreshold = toBigIntSafe(
    guardianUnlockStatus?.[1] ?? v?.guardianUnlockThreshold ?? 250000n
  );
  const guardiansRemaining = toBigIntSafe(
    guardianUnlockStatus?.[2] ??
      (guardianThreshold > syncedGuardianCount
        ? guardianThreshold - syncedGuardianCount
        : 0n)
  );
  const guardianThresholdMet = toBoolSafe(
    guardianUnlockStatus?.[3] ?? v?.guardianThresholdMet ?? false
  );

  const operationallyLocked = !!v?.operationallyLocked;
  const operationalLockReason = String(v?.operationalLockReason || "");

  const cubeBalanceNum = Number(cubeBalance);
  const guardianStateLabel =
    cubeBalanceNum === 1 ? "COHERENT" : cubeBalanceNum === 0 ? "SILENT" : "FRACTURED";

  const guardianAccessLabel = guardianActionsAllowed ? "ACTIVE" : "LOCKED";

  const commitStatusLabel = operationallyLocked
    ? "LOCKED"
    : commitAllowed
    ? "READY"
    : "BLOCKED";

  const commitStatusKind = operationallyLocked
    ? "EXPIRED"
    : commitAllowed
    ? "READY"
    : "WAITING";

  const guardianMessage =
    guardianStateLabel === "COHERENT"
      ? "Wallet holds exactly 1 cube. Guardian state is coherent."
      : guardianStateLabel === "SILENT"
      ? "Wallet holds 0 cubes. Guardian state is silent."
      : "Wallet holds 2 or more cubes. Guardian state is fractured.";

  const thresholdMessage = guardianThresholdMet
    ? "Synchronized coherent guardian threshold reached. Commit path may open when other checks pass."
    : `Synchronized coherent guardian threshold not yet met. ${syncedGuardianCount.toString()} / ${guardianThreshold.toString()} counted.`;

  const actionLockReason = operationallyLocked
    ? operationalLockReason || "Operational lock active"
    : !guardianThresholdMet
    ? `Guardian threshold not met (${syncedGuardianCount.toString()}/${guardianThreshold.toString()})`
    : !guardianActionsAllowed
    ? guardianStateLabel === "SILENT"
      ? "Guardian access locked: wallet holds 0 cubes"
      : "Guardian access locked: wallet holds 2+ cubes"
    : commitCooldownRemaining > 0n
    ? "Commit cooldown active"
    : !commitAllowed && commitReason && commitReason !== "OK"
    ? commitReason
    : "—";

  function getWithdrawDecimals(tokenAddr) {
    const t = String(tokenAddr || "").toLowerCase();

    if (t === String(v?.eonAddress || "").toLowerCase()) return Number(v?.eonDecimals ?? 18);
    if (t === String(v?.usdt0Address || "").toLowerCase()) return Number(v?.usdt0Decimals ?? 6);
    if (t === String(v?.wflrAddress || "").toLowerCase()) return Number(v?.wflrDecimals ?? 18);
    if (t === String(v?.fxrpAddress || "").toLowerCase()) return Number(v?.fxrpDecimals ?? 18);

    return 18;
  }

  function getWithdrawTokenLabel(tokenAddr) {
    const t = String(tokenAddr || "").toLowerCase();

    if (t === String(v?.eonAddress || "").toLowerCase()) return v?.eonSymbol || "EON";
    if (t === String(v?.usdt0Address || "").toLowerCase()) return v?.usdt0Symbol || "USDT0";
    if (t === String(v?.wflrAddress || "").toLowerCase()) return v?.wflrSymbol || "WFLR";
    if (t === String(v?.fxrpAddress || "").toLowerCase()) return v?.fxrpSymbol || "FXRP";

    return isAddr(tokenAddr) ? shortAddr(tokenAddr) : "TOKEN";
  }

  function readyInForWithdrawal(w) {
    try {
      const nowTs =
        typeof v?.checkpointNowTs === "bigint" && v.checkpointNowTs > 0n
          ? v.checkpointNowTs
          : 0n;

      const notBefore =
        typeof w?.notBefore === "bigint" && w.notBefore > 0n ? w.notBefore : 0n;

      if (nowTs === 0n || notBefore === 0n) return 0n;
      return notBefore > nowTs ? notBefore - nowTs : 0n;
    } catch {
      return 0n;
    }
  }

  function statusLabel(w) {
    if (!w) return "—";
    if (w.executed) return "EXECUTED";
    if (w.cancelled) return "CANCELLED";
    return readyInForWithdrawal(w) === 0n ? "READY" : "WAITING";
  }

  function statusKind(w) {
    if (!w) return "WAITING";
    if (w.executed) return "READY";
    if (w.cancelled) return "EXPIRED";
    return readyInForWithdrawal(w) === 0n ? "READY" : "WAITING";
  }

  return (
    <div style={ui.claimBox}>
      <button type="button" onClick={() => setAccessOpen((x) => !x)} style={ui.contribHead}>
        <div>
          <div style={ui.contribTitle}>Access State</div>
          <div style={ui.contribSub}>
            Guardian coherence, synchronized threshold, controller rotation and staged withdrawal visibility
          </div>
        </div>
        <div style={ui.contribChev}>{accessOpen ? "▾" : "▸"}</div>
      </button>

      {accessOpen ? (
        <div style={ui.contribBody}>
          <MiniSection
            ui={ui}
            title="Guardian State"
            subtitle="Cube coherence, threshold, claims and commit access"
            open={guardianOpen}
            setOpen={setGuardianOpen}
          >
            <StatRow label="cube balance" value={cubeBalance.toString()} />

            <StatRow
              label="guardian state"
              value={
                <span style={badgeStyle(guardianStateLabel === "COHERENT" ? "READY" : "WAITING")}>
                  {guardianStateLabel}
                </span>
              }
            />

            <StatRow
              label="guardian threshold"
              value={
                <span style={badgeStyle(guardianThresholdMet ? "READY" : "WAITING")}>
                  {guardianThresholdMet ? "MET" : "LOCKED"}
                </span>
              }
            />

            <StatRow
              label="synced guardians"
              value={`${syncedGuardianCount.toString()} / ${guardianThreshold.toString()}`}
            />

            <StatRow label="remaining to unlock" value={guardiansRemaining.toString()} />

            <StatRow
              label="guardian access"
              value={
                <span style={badgeStyle(guardianActionsAllowed ? "READY" : "EXPIRED")}>
                  {guardianAccessLabel}
                </span>
              }
            />

            <StatRow
              label="contribution access"
              value={
                <span style={badgeStyle(contributionAllowed ? "READY" : "EXPIRED")}>
                  {contributionAllowed ? "OPEN" : "LOCKED"}
                </span>
              }
            />

            <StatRow
              label="commit status"
              value={<span style={badgeStyle(commitStatusKind)}>{commitStatusLabel}</span>}
            />

            <StatRow label="open claims" value={userOpenClaims.toString()} />
            <StatRow label="commit cooldown" value={formatDurationShort(commitCooldownRemaining)} />
            <StatRow label="lock reason" value={actionLockReason} />

            <div style={ui.footnote}>{guardianMessage}</div>
            <div style={ui.footnote}>{thresholdMessage}</div>
          </MiniSection>

          <MiniSection
            ui={ui}
            title="Controller / Withdraw Access"
            subtitle="Controller rotation, staged withdrawals, and local time tools"
            open={controllerOpen}
            setOpen={setControllerOpen}
          >
            <StatRow label="controller" value={isAddr(v?.controller) ? shortAddr(v.controller) : "—"} />

            <StatRow
              label="pending controller"
              value={
                isAddr(v?.pendingController) &&
                v.pendingController !== "0x0000000000000000000000000000000000000000"
                  ? shortAddr(v.pendingController)
                  : "—"
              }
            />

            <StatRow label="pending activation" value={formatUnixTs(v?.pendingControllerActivationTime)} />

            <StatRow
              label="withdraw authorizations"
              value={v?.withdrawAuthorizationNonce?.toString?.() ?? "—"}
            />

            <StatRow label="pending staged withdraws" value={String(pendingWithdrawItems.length)} />
            <StatRow label="past staged withdraws" value={String(historyItems.length)} />

            <StatRow
              label="next release"
              value={nextPendingWithdraw ? `${nextWithdrawAmountText} ${nextWithdrawTokenLabel}` : "—"}
            />

            <StatRow
              label="ready in"
              value={nextPendingWithdraw ? formatDurationShort(nextWithdrawReadyIn) : "—"}
            />

          </MiniSection>

          <MiniSection
            ui={ui}
            title="Pending Withdrawals"
            subtitle="Active staged withdrawals waiting for release"
            open={pendingOpen}
            setOpen={setPendingOpen}
          >
            {!pendingWithdrawItems.length ? (
              <div style={{ opacity: 0.6 }}>No pending withdrawals</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {pendingWithdrawItems.map((w, i) => {
                  const readyIn = readyInForWithdrawal(w);
                  const ready = readyIn === 0n;
                  const decimals = getWithdrawDecimals(w?.token);
                  const tokenLabel = getWithdrawTokenLabel(w?.token);

                  return (
                    <div key={w?.id?.toString?.() || i} style={ui.claimRowCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>#{w?.id?.toString?.() || i}</div>
                        <div style={badgeStyle(ready ? "READY" : "WAITING")}>
                          {ready ? "READY" : "WAITING"}
                        </div>
                      </div>

                      <div style={ui.claimMeta}>
                        <div style={ui.claimMetaRow}>
                          <span style={ui.claimK}>amount</span>
                          <span style={ui.claimV}>
                            {formatUnitsSafe(w?.amount ?? 0n, decimals)} {tokenLabel}
                          </span>
                        </div>

                        <div style={ui.claimMetaRow}>
                          <span style={ui.claimK}>token</span>
                          <span style={ui.claimV}>{tokenLabel}</span>
                        </div>

                        <div style={ui.claimMetaRow}>
                          <span style={ui.claimK}>to</span>
                          <span style={ui.claimV}>{isAddr(w?.to) ? shortAddr(w.to) : "—"}</span>
                        </div>

                        <div style={ui.claimMetaRow}>
                          <span style={ui.claimK}>not before</span>
                          <span style={ui.claimV}>{formatUnixTs(w?.notBefore)}</span>
                        </div>

                        <div style={ui.claimMetaRow}>
                          <span style={ui.claimK}>ready in</span>
                          <span style={ui.claimV}>{formatDurationShort(readyIn)}</span>
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          style={{
                            ...ui.btnPrimary,
                            opacity: ready ? 1 : 0.5,
                            cursor: ready ? "pointer" : "not-allowed",
                          }}
                          disabled={!ready}
                          onClick={() => onExecuteWithdrawAuthorization(w?.id)}
                        >
                          Execute
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </MiniSection>

          <MiniSection
            ui={ui}
            title="Past Withdrawals"
            subtitle="Executed or cancelled staged withdrawals"
            open={historyOpen}
            setOpen={setHistoryOpen}
          >
            {!historyItems.length ? (
              <div style={{ opacity: 0.6 }}>No history</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  maxHeight: historyItems.length > 2 ? 260 : "none",
                  overflowY: historyItems.length > 2 ? "auto" : "visible",
                  paddingRight: historyItems.length > 2 ? 6 : 0,
                }}
              >
                {historyItems.map((w, i) => {
                  const decimals = getWithdrawDecimals(w?.token);
                  const tokenLabel = getWithdrawTokenLabel(w?.token);

                  return (
                    <div key={w?.id?.toString?.() || i} style={ui.claimRowCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>#{w?.id?.toString?.() || i}</div>
                        <div style={badgeStyle(statusKind(w))}>{statusLabel(w)}</div>
                      </div>

                      <div style={ui.claimMeta}>
                        <div style={ui.claimMetaRow}>
                          <span style={ui.claimK}>amount</span>
                          <span style={ui.claimV}>
                            {formatUnitsSafe(w?.amount ?? 0n, decimals)} {tokenLabel}
                          </span>
                        </div>

                        <div style={ui.claimMetaRow}>
                          <span style={ui.claimK}>token</span>
                          <span style={ui.claimV}>{tokenLabel}</span>
                        </div>

                        <div style={ui.claimMetaRow}>
                          <span style={ui.claimK}>to</span>
                          <span style={ui.claimV}>{isAddr(w?.to) ? shortAddr(w.to) : "—"}</span>
                        </div>

                        <div style={ui.claimMetaRow}>
                          <span style={ui.claimK}>not before</span>
                          <span style={ui.claimV}>{formatUnixTs(w?.notBefore)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </MiniSection>

          <div style={ui.footnote}>
            Access State stays summary-only. Vault movement is visible in Vault panels.
          </div>
        </div>
      ) : null}
    </div>
  );
}
