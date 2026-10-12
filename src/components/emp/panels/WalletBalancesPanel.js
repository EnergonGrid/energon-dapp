import React from "react";
import Panel from "../Panel";
import StatRow from "../StatRow";

export default function WalletBalancesPanel({
  v,
  address,
  walletNative,
  walletEon,
  walletUsdt0,
  walletWflr,
  fxrpAddress,
  fxrpDecimals,
  wflrDecimals,
  eonDecimals,
  usdt0Decimals,
  formatUnitsSafe,
  shortAddr,
  isAddr,
}) {
  const cubeBalance = v?.cubeBalance ?? 0n;

  const cubeDisplay =
    cubeBalance === 1n ? "Key" : cubeBalance === 0n ? "No Key" : "Fractured";

  const cubeTone =
    cubeBalance === 1n ? "key" : cubeBalance === 0n ? "none" : "fractured";

  const cubeValueStyle =
    cubeTone === "key"
      ? {
          color: "#70ffd0",
          fontWeight: 1000,
          textShadow: "0 0 12px rgba(0,255,190,0.35)",
        }
      : cubeTone === "fractured"
      ? {
          color: "#ff6464",
          fontWeight: 1000,
          textShadow: "0 0 12px rgba(255,80,80,0.35)",
        }
      : {
          color: "rgba(255,255,255,0.45)",
          fontWeight: 900,
        };

  return (
    <Panel title="Wallet Balances" subtitle="Connected wallet">
      <StatRow label="wallet" value={shortAddr(address)} />

      <StatRow label="native" value={formatUnitsSafe(walletNative, 18, 6)} />

      <StatRow
        label="Energon Cube"
        value={<span style={cubeValueStyle}>{cubeDisplay}</span>}
      />

      <StatRow label="EON" value={formatUnitsSafe(walletEon, eonDecimals)} />

      <StatRow
        label="USDT0"
        value={formatUnitsSafe(walletUsdt0, usdt0Decimals)}
      />

      <StatRow label="WFLR" value={formatUnitsSafe(walletWflr, wflrDecimals)} />

      {isAddr(fxrpAddress) ? (
        <StatRow
          label="FXRP"
          value={formatUnitsSafe(v.walletFxrpBal ?? 0n, fxrpDecimals)}
        />
      ) : null}
    </Panel>
  );
}