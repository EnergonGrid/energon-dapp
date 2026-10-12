// src/components/emp/panels/VaultBalancesPanel.js
import React from "react";
import Panel from "../Panel";
import StatRow from "../StatRow";

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

function getCoverageTier(balance, required) {
  const bal = toBigIntSafe(balance);
  const req = toBigIntSafe(required);

  if (req <= 0n || bal <= 0n) {
    return {
      tier: "EMPTY",
      color: "#9aa0a6",
    };
  }

  const coverageBps = (bal * 10000n) / req;

  if (coverageBps >= 100000n) {
    return {
      tier: "OVERFLOW",
      color: "#57ff93",
    };
  }

  if (coverageBps >= 50000n) {
    return {
      tier: "STRONG",
      color: "#7dff7a",
    };
  }

  if (coverageBps >= 30000n) {
    return {
      tier: "STABLE",
      color: "#ffe066",
    };
  }

  if (coverageBps >= 15000n) {
    return {
      tier: "WEAK",
      color: "#ffb347",
    };
  }

  return {
    tier: "CRITICAL",
    color: "#ff6b6b",
  };
}

export default function VaultBalancesPanel({
  ui,
  v,
  fxrpAddress,
  fxrpDecimals,
  wflrDecimals,
  eonDecimals,
  usdt0Decimals,
  formatUnitsSafe,
  showEonAsUsd,
  setShowEonAsUsd,
  showUsdtAsUsd,
  setShowUsdtAsUsd,
  eonDisplay,
  usdtDisplay,
  feeGlowEon,
  feeGlowUsdt0,
  priceCenterStyle,
  usdtPerEon_1e18,
  usdtPerEonText,
  vaultHealthPercent,
  isAddr,
}) {
  const eonTier = getCoverageTier(
    v?.vaultEonBal ?? v?.vaultEonBalance ?? 0n,
    v?.requiredEonReserve ?? v?.eonRequiredReserve ?? 0n,
  );

  const usdt0Tier = getCoverageTier(
    v?.vaultUsdt0Bal ?? v?.vaultUsdt0Balance ?? 0n,
    v?.requiredUsdt0Reserve ?? v?.usdt0RequiredReserve ?? 0n,
  );

  return (
    <Panel title="Vault Balances" subtitle="Live available reserves">
      <StatRow
        label={v.eonSymbol ?? "EON"}
        value={
          <span
            onClick={() => setShowEonAsUsd((x) => !x)}
            style={ui.tapValue}
            title="Tap to toggle EON ↔ USD"
          >
            {eonDisplay}
          </span>
        }
      />

      <StatRow
        label="USDT0"
        value={
          <span
            onClick={() => setShowUsdtAsUsd((x) => !x)}
            style={ui.tapValue}
            title="Tap to toggle USDT0 ↔ USD"
          >
            {usdtDisplay}
          </span>
        }
      />

      <StatRow
        label={v.wflrSymbol ?? "WFLR"}
        value={formatUnitsSafe(v.vaultWflrBal, wflrDecimals)}
      />

      {isAddr(fxrpAddress) ? (
        <StatRow
          label="FXRP"
          value={formatUnitsSafe(v.vaultFxrpBal ?? 0n, fxrpDecimals)}
        />
      ) : null}

      <div style={ui.sep} />

      <div style={ui.esGrowMiniWrap}>
        <div style={ui.esGrowMiniRow}>
          <span
            style={feeGlowEon ? ui.esGrowMiniLabelGlow : ui.esGrowMiniLabel}
          >
            EON EsGrow
          </span>

          <span
            style={feeGlowEon ? ui.esGrowMiniValueGlow : ui.esGrowMiniValue}
          >
            {formatUnitsSafe(v.totalFeesCollectedEon ?? 0n, eonDecimals)}
          </span>
        </div>

        <div style={ui.esGrowMiniRow}>
          <span
            style={feeGlowUsdt0 ? ui.esGrowMiniLabelGlow : ui.esGrowMiniLabel}
          >
            USDT0 EsGrow
          </span>

          <span
            style={feeGlowUsdt0 ? ui.esGrowMiniValueGlow : ui.esGrowMiniValue}
          >
            {formatUnitsSafe(v.totalFeesCollectedUsdt0 ?? 0n, usdt0Decimals)}
          </span>
        </div>
      </div>

      <div style={ui.sep} />

      <div style={{ marginTop: 4, textAlign: "center" }}>
        <div style={ui.esGrowMiniLabel}>EON price</div>

        <div style={priceCenterStyle}>
          {usdtPerEon_1e18 > 0n ? `${usdtPerEonText} USDT0` : "—"}
        </div>

        <div style={{ ...ui.esGrowMiniLabel, marginTop: 2 }}>
          effective reserves
        </div>

        <div style={{ ...ui.esGrowMiniLabel, marginTop: 8 }}>Vault health</div>

        <div
          style={{
            marginTop: 4,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.4,
          }}
        >
          <span>
            EON <span style={{ color: eonTier.color }}>● {eonTier.tier}</span>
          </span>

          <span>
            USDT0{" "}
            <span style={{ color: usdt0Tier.color }}>● {usdt0Tier.tier}</span>
          </span>
        </div>

        <div style={{ ...ui.esGrowMiniLabel, marginTop: 4 }}>
          {vaultHealthPercent}% minimum coverage
        </div>
      </div>
    </Panel>
  );
}
