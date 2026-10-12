// src/components/emp/panels/VaultStatePanel.js
import React from "react";
import Panel from "../Panel";

function toBigIntSafe(value, fallback = 0n) {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(Math.floor(value));
    if (typeof value === "string" && value.trim() !== "") return BigInt(value);
    return fallback;
  } catch {
    return fallback;
  }
}

function coveragePct(balance, minimum) {
  const bal = toBigIntSafe(balance);
  const min = toBigIntSafe(minimum);

  if (min <= 0n || bal <= 0n) return 0;

  const pctX100 = (bal * 10000n) / min;
  return Number(pctX100) / 100;
}

function visualPctFromCoverage(pct) {
  return Math.max(0, Math.min(100, (Number(pct || 0) / 5000) * 100));
}

function reservedPct(reserved, total) {
  const r = toBigIntSafe(reserved);
  const t = toBigIntSafe(total);

  if (t <= 0n || r <= 0n) return 0;

  const pctX100 = (r * 10000n) / t;
  return Math.max(0, Math.min(100, Number(pctX100) / 100));
}

function assetTone(label, pct) {
  const safePct = Math.max(0, Number(pct || 0));

  const overflowColor =
    label === "EON"
      ? "#00d9ff" // Energon blue
      : label === "USDT0"
      ? "#57ff93" // green
      : label === "WFLR"
      ? "#ff4f8b" // Flare reddish pink
      : label === "FXRP"
      ? "#a66bff" // purple
      : "#57ff93";

  const strongStart =
    label === "EON"
      ? "#54f0d1"
      : label === "USDT0"
      ? "#ffd84d"
      : label === "WFLR"
      ? "#61b8ff"
      : label === "FXRP"
      ? "#ff8a7a"
      : "#54f0d1";

  if (safePct >= 5000) {
    return {
      label: "OVERFLOW",
      fill: `linear-gradient(90deg, ${strongStart} 0%, ${overflowColor} 100%)`,
      glow: `0 0 18px ${overflowColor}66`,
    };
  }

  if (safePct >= 1500) {
    return {
      label: "STRONG",
      fill: `linear-gradient(90deg, ${strongStart} 0%, ${overflowColor} 72%, ${overflowColor} 100%)`,
      glow: `0 0 14px ${overflowColor}44`,
    };
  }

  if (safePct >= 500) {
    return {
      label: "STABLE",
      fill: "linear-gradient(90deg, #ffe066 0%, #fff0a6 100%)",
      glow: "0 0 12px rgba(255,224,102,0.22)",
    };
  }

  if (safePct >= 150) {
    return {
      label: "WEAK",
      fill: "linear-gradient(90deg, #ffb347 0%, #ffd166 100%)",
      glow: "0 0 12px rgba(255,179,71,0.22)",
    };
  }

  return {
    label: "CRITICAL",
    fill: "linear-gradient(90deg, #ff6b6b 0%, #ff8e72 100%)",
    glow: "0 0 12px rgba(255,107,107,0.22)",
  };
}

function ReserveRow({ label, balance, minimum }) {
  const pct = coveragePct(balance, minimum);
  const visualPct = visualPctFromCoverage(pct);
  const tone = assetTone(label, pct);

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 0.3,
        }}
      >
        <span>{label}</span>
        <span>{tone.label}</span>
      </div>

      <div
        style={{
          height: 14,
          borderRadius: 999,
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.14)",
          overflow: "hidden",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            width: `${visualPct}%`,
            height: "100%",
            borderRadius: 999,
            background: tone.fill,
            boxShadow: tone.glow,
            transition: "width 220ms ease",
          }}
        />
      </div>
    </div>
  );
}

function ReservedBar({ label, reserved, total }) {
  const pct = reservedPct(reserved, total);

  let fill = "linear-gradient(90deg, #6fdc8c 0%, #7ee6ff 100%)";
  let tone = "LOW";

  if (pct >= 80) {
    fill = "linear-gradient(90deg, #ff6b6b 0%, #ff8e72 100%)";
    tone = "HIGH";
  } else if (pct >= 40) {
    fill = "linear-gradient(90deg, #ffd84d 0%, #ffb84d 100%)";
    tone = "MEDIUM";
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 0.3,
        }}
      >
        <span>{label}</span>
        <span>
          {Math.round(pct)}% • {tone}
        </span>
      </div>

      <div
        style={{
          height: 14,
          borderRadius: 999,
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.14)",
          overflow: "hidden",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: fill,
            boxShadow: "0 0 10px rgba(255,255,255,0.10)",
            transition: "width 220ms ease",
          }}
        />
      </div>
    </div>
  );
}

export default function VaultStatePanel({ ui, v }) {
  const eonBalanceRaw = toBigIntSafe(
    v?.activeVaultEonBal ?? v?.vaultEonBal ?? 0n
  );

  const usdt0BalanceRaw = toBigIntSafe(
    v?.activeVaultUsdt0Bal ?? v?.vaultUsdt0Bal ?? 0n
  );

  const wflrBalanceRaw = toBigIntSafe(
    v?.activeVaultWflrBal ?? v?.vaultWflrBal ?? 0n
  );

  const fxrpBalanceRaw = toBigIntSafe(
    v?.activeVaultFxrpBal ?? v?.vaultFxrpBal ?? 0n
  );

  const eonMinRaw = toBigIntSafe(
    v?.requiredEonReserve ?? v?.minEonReserve ?? 0n
  );

  const usdt0MinRaw = toBigIntSafe(
    v?.requiredUsdt0Reserve ?? v?.minUsdt0Reserve ?? 0n
  );

  const wflrMinRaw = toBigIntSafe(v?.minWflrReserve ?? 0n);
  const fxrpMinRaw = toBigIntSafe(v?.minFxrpReserve ?? 0n);

  return (
    <Panel title="Vault State" subtitle="Reserve status">
      <ReserveRow label="EON" balance={eonBalanceRaw} minimum={eonMinRaw} />
      <ReserveRow label="USDT0" balance={usdt0BalanceRaw} minimum={usdt0MinRaw} />
      <ReserveRow label="WFLR" balance={wflrBalanceRaw} minimum={wflrMinRaw} />

      {v?.fxrpAddress ? (
        <ReserveRow label="FXRP" balance={fxrpBalanceRaw} minimum={fxrpMinRaw} />
      ) : null}

      <div style={ui.sep} />

      <ReservedBar
        label="EON reserved"
        reserved={v?.reservedEon ?? 0n}
        total={eonBalanceRaw}
      />

      <ReservedBar
        label="USDT0 reserved"
        reserved={v?.reservedUsdt0 ?? 0n}
        total={usdt0BalanceRaw}
      />
    </Panel>
  );
}