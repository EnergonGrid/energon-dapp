import React from "react";
import StatRow from "@/components/emp/StatRow";

export default function DeterministicPanel({
  ui,
  deterministicOpen,
  setDeterministicOpen,
  isConnected,
  v,
  hasCheckpointFns,
  checkpointPriceText,
  formatDurationShort,
  checkpointAgeSec,
  checkpointResetInSec,
}) {
  return (
    <div style={ui.claimBox}>
      <button
        type="button"
        onClick={() => setDeterministicOpen((x) => !x)}
        style={ui.contribHead}
      >
        <div>
          <div style={ui.contribTitle}>Deterministic</div>
          <div style={ui.contribSub}>
            Protocol timings, limits, and checkpoint state
          </div>
        </div>
        <div style={ui.contribChev}>{deterministicOpen ? "▾" : "▸"}</div>
      </button>

      {deterministicOpen ? (
        <div style={ui.contribBody}>
          <StatRow label="connected" value={isConnected ? "YES" : "NO"} />
          <StatRow label="vault enabled" value={v.enabled ? "YES" : "NO"} />
          <StatRow label="poll interval" value="2.5s (UI)" />

          <StatRow label="free maturity" value="24 hours" />
          <StatRow label="fast maturity" value="12 hours / 10% fee" />
          <StatRow label="rapid maturity" value="6 hours / 20% fee" />

          <StatRow label="claim expiry" value="90 days" />
          <StatRow label="max open claims" value="2 per wallet" />
          <StatRow label="commit cooldown" value="10 minutes" />
          <StatRow label="max claim share" value="35% free reserves" />

          <StatRow label="price window" value="1 hour" />
          <StatRow label="max EON price drop" value="25.00% / hour" />
          <StatRow label="max EON price rise" value="50.00% / hour" />

          <StatRow label="payout window" value="12 hours" />

          <StatRow label="liability floor" value="25.00%" />
          <StatRow label="guardian activation" value="12 hours" />
          <StatRow label="controller delay" value="7 days" />
          <StatRow label="withdraw delay" value="12 hours" />

          {hasCheckpointFns ? (
            <>
              <StatRow
                label="checkpoint"
                value={checkpointPriceText !== "—" ? checkpointPriceText : "—"}
              />
              <StatRow
                label="checkpoint age"
                value={formatDurationShort(checkpointAgeSec)}
              />
              <StatRow
                label="resets in"
                value={formatDurationShort(checkpointResetInSec)}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}