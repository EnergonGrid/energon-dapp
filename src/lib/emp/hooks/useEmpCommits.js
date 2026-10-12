// src/lib/emp/hooks/useEmpCommits.js
import { useCallback } from "react";

function abiHasFn(abi, name) {
  try {
    const a = Array.isArray(abi) ? abi : abi?.abi;
    if (!Array.isArray(a)) return false;
    return a.some((it) => it && it.type === "function" && it.name === name);
  } catch {
    return false;
  }
}

function normalizeTier(tier) {
  const n = Number(tier ?? 0);
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 0;
}

export default function useEmpCommits({
  canWrite,
  operationalReady,
  operationalMsg,
  setStatus,
  sendTx,
  writeContractAsync,
  publicClient,
  v,
  EVaultAbi,
  erc20Abi,
  GAS_APPROVE,
  GAS_COMMIT,
  BPS_DENOM,
  SLIPPAGE_BPS,
  parseUnitsOrZero,
  formatUnitsSafe,
  refreshEonPrice,
  claimsOpen,
  pastClaimsOpen,
  syncClaimsForWallet,
  syncPastClaimsForWallet,
  usdt0Decimals,
  eonDecimals,
  setCommitUsdtIn,
  setModeUsdt,
  setCommitEonIn,
  setModeEon,
  setApproveUsdt0,
  setApproveEon,

  guardianCoherent = false,
  guardianActionsAllowed = false,
  guardianThresholdMet = false,
}) {
  const guardianCommitBlocked = useCallback(() => {
    if (!guardianCoherent) return "Commit requires exactly 1 EnergonCube.";
    if (!guardianActionsAllowed) return "Guardian activation incomplete.";
    if (!guardianThresholdMet) return "Guardian threshold not met.";
    return "";
  }, [guardianCoherent, guardianActionsAllowed, guardianThresholdMet]);

  const syncAfterConfirmed = useCallback(async () => {
    await refreshEonPrice?.();
    if (claimsOpen) await syncClaimsForWallet?.();
    if (pastClaimsOpen) await syncPastClaimsForWallet?.();
  }, [
    refreshEonPrice,
    claimsOpen,
    syncClaimsForWallet,
    pastClaimsOpen,
    syncPastClaimsForWallet,
  ]);

  const onApproveUsdt0 = useCallback(
    async (approveUsdt0) => {
      if (!operationalReady) {
        setStatus?.(operationalMsg || "Operational lock");
        return null;
      }

      if (!canWrite) {
        setStatus?.("USDT0 approval: not ready");
        return null;
      }

      const amt = parseUnitsOrZero(approveUsdt0, usdt0Decimals);
      if (amt <= 0n) {
        setStatus?.("USDT0 approval: enter an amount");
        return null;
      }

      const approvedStr = String(approveUsdt0 || "").trim();

      const hash = await sendTx("Approve USDT0", () =>
        writeContractAsync({
          address: v.usdt0Address,
          abi: erc20Abi,
          functionName: "approve",
          args: [v.vaultAddress, amt],
          gas: GAS_APPROVE,
        })
      );

      if (hash) {
        setCommitUsdtIn?.(approvedStr);
        setModeUsdt?.("COMMIT");
      }

      return hash;
    },
    [
      operationalReady,
      operationalMsg,
      canWrite,
      parseUnitsOrZero,
      usdt0Decimals,
      sendTx,
      writeContractAsync,
      v.usdt0Address,
      v.vaultAddress,
      erc20Abi,
      GAS_APPROVE,
      setStatus,
      setCommitUsdtIn,
      setModeUsdt,
    ]
  );

  const onCommitUsdtForEon = useCallback(
    async (commitUsdtIn, maturityTier = 0) => {
      const guardianBlock = guardianCommitBlocked();
      if (guardianBlock) {
        setStatus?.(guardianBlock);
        return null;
      }

      if (!operationalReady) {
        setStatus?.(operationalMsg || "Operational lock");
        return null;
      }

      if (!canWrite) {
        setStatus?.("USDT0 → EON: not ready");
        return null;
      }

      if (!publicClient) {
        setStatus?.("USDT0 → EON: no public client");
        return null;
      }

      const tier = normalizeTier(maturityTier);
      const usdtIn = parseUnitsOrZero(commitUsdtIn, usdt0Decimals);

      if (usdtIn <= 0n) {
        setStatus?.("USDT0 → EON: enter an amount");
        return null;
      }

      const hasTierQuote = abiHasFn(EVaultAbi, "quoteUsdt0ForEonTier");
      const hasBaseQuote = abiHasFn(EVaultAbi, "quoteUsdt0ForEon");
      const hasTierCommit = abiHasFn(EVaultAbi, "commitUsdt0ForEonTier");
      const hasBaseCommit = abiHasFn(EVaultAbi, "commitUsdt0ForEon");

      if (!hasTierQuote && !hasBaseQuote) {
        setStatus?.("USDT0 → EON: quote function missing in ABI");
        return null;
      }

      if (!hasTierCommit && !hasBaseCommit) {
        setStatus?.("USDT0 → EON: commit function missing in ABI");
        return null;
      }

      const allowanceOk = (v.usdt0Allowance ?? 0n) >= usdtIn;
      if (!allowanceOk) {
        setStatus?.(
          `USDT0 → EON: approve at least ${formatUnitsSafe(
            usdtIn,
            usdt0Decimals
          )} USDT0 first`
        );
        return null;
      }

      const hash = await sendTx(
        "USDT0 → EON",
        async () => {
          const q = await publicClient.readContract({
            address: v.vaultAddress,
            abi: EVaultAbi,
            functionName: hasTierQuote
              ? "quoteUsdt0ForEonTier"
              : "quoteUsdt0ForEon",
            args: hasTierQuote ? [usdtIn, tier] : [usdtIn],
          });

          const outNet = typeof q?.[0] === "bigint" ? q[0] : 0n;

          if (outNet <= 0n) {
            throw new Error("USDT0 → EON quote returned zero output");
          }

          const minOut = (outNet * (BPS_DENOM - SLIPPAGE_BPS)) / BPS_DENOM;

          return writeContractAsync({
            address: v.vaultAddress,
            abi: EVaultAbi,
            functionName: hasTierCommit
              ? "commitUsdt0ForEonTier"
              : "commitUsdt0ForEon",
            args: hasTierCommit ? [usdtIn, minOut, tier] : [usdtIn, minOut],
            gas: GAS_COMMIT,
          });
        },
        { onConfirmed: syncAfterConfirmed }
      );

      if (hash) {
        setCommitUsdtIn?.("");
        setApproveUsdt0?.("");
        setModeUsdt?.("APPROVE");
      }

      return hash;
    },
    [
      guardianCommitBlocked,
      operationalReady,
      operationalMsg,
      canWrite,
      publicClient,
      parseUnitsOrZero,
      usdt0Decimals,
      EVaultAbi,
      v.usdt0Allowance,
      v.vaultAddress,
      BPS_DENOM,
      SLIPPAGE_BPS,
      GAS_COMMIT,
      sendTx,
      writeContractAsync,
      formatUnitsSafe,
      setStatus,
      setCommitUsdtIn,
      setApproveUsdt0,
      setModeUsdt,
      syncAfterConfirmed,
    ]
  );

  const onApproveEon = useCallback(
    async (approveEon) => {
      if (!operationalReady) {
        setStatus?.(operationalMsg || "Operational lock");
        return null;
      }

      if (!canWrite) {
        setStatus?.("EON approval: not ready");
        return null;
      }

      const amt = parseUnitsOrZero(approveEon, eonDecimals);
      if (amt <= 0n) {
        setStatus?.("EON approval: enter an amount");
        return null;
      }

      const approvedStr = String(approveEon || "").trim();

      const hash = await sendTx("Approve EON", () =>
        writeContractAsync({
          address: v.eonAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [v.vaultAddress, amt],
          gas: GAS_APPROVE,
        })
      );

      if (hash) {
        setCommitEonIn?.(approvedStr);
        setModeEon?.("COMMIT");
      }

      return hash;
    },
    [
      operationalReady,
      operationalMsg,
      canWrite,
      parseUnitsOrZero,
      eonDecimals,
      sendTx,
      writeContractAsync,
      v.eonAddress,
      v.vaultAddress,
      erc20Abi,
      GAS_APPROVE,
      setStatus,
      setCommitEonIn,
      setModeEon,
    ]
  );

  const onCommitEonForUsdt0 = useCallback(
    async (commitEonIn, maturityTier = 0) => {
      const guardianBlock = guardianCommitBlocked();
      if (guardianBlock) {
        setStatus?.(guardianBlock);
        return null;
      }

      if (!operationalReady) {
        setStatus?.(operationalMsg || "Operational lock");
        return null;
      }

      if (!canWrite) {
        setStatus?.("EON → USDT0: not ready");
        return null;
      }

      if (!publicClient) {
        setStatus?.("EON → USDT0: no public client");
        return null;
      }

      const tier = normalizeTier(maturityTier);
      const eonIn = parseUnitsOrZero(commitEonIn, eonDecimals);

      if (eonIn <= 0n) {
        setStatus?.("EON → USDT0: enter an amount");
        return null;
      }

      const hasTierQuote = abiHasFn(EVaultAbi, "quoteEonForUsdt0Tier");
      const hasBaseQuote = abiHasFn(EVaultAbi, "quoteEonForUsdt0");
      const hasTierCommit = abiHasFn(EVaultAbi, "commitEonForUsdt0Tier");
      const hasBaseCommit = abiHasFn(EVaultAbi, "commitEonForUsdt0");

      if (!hasTierQuote && !hasBaseQuote) {
        setStatus?.("EON → USDT0: quote function missing in ABI");
        return null;
      }

      if (!hasTierCommit && !hasBaseCommit) {
        setStatus?.("EON → USDT0: commit function missing in ABI");
        return null;
      }

      const allowanceOk = (v.eonAllowance ?? 0n) >= eonIn;
      if (!allowanceOk) {
        setStatus?.(
          `EON → USDT0: approve at least ${formatUnitsSafe(
            eonIn,
            eonDecimals
          )} EON first`
        );
        return null;
      }

      const hash = await sendTx(
        "EON → USDT0",
        async () => {
          const q = await publicClient.readContract({
            address: v.vaultAddress,
            abi: EVaultAbi,
            functionName: hasTierQuote
              ? "quoteEonForUsdt0Tier"
              : "quoteEonForUsdt0",
            args: hasTierQuote ? [eonIn, tier] : [eonIn],
          });

          const outNet = typeof q?.[0] === "bigint" ? q[0] : 0n;

          if (outNet <= 0n) {
            throw new Error("EON → USDT0 quote returned zero output");
          }

          const minOut = (outNet * (BPS_DENOM - SLIPPAGE_BPS)) / BPS_DENOM;

          return writeContractAsync({
            address: v.vaultAddress,
            abi: EVaultAbi,
            functionName: hasTierCommit
              ? "commitEonForUsdt0Tier"
              : "commitEonForUsdt0",
            args: hasTierCommit ? [eonIn, minOut, tier] : [eonIn, minOut],
            gas: GAS_COMMIT,
          });
        },
        { onConfirmed: syncAfterConfirmed }
      );

      if (hash) {
        setCommitEonIn?.("");
        setApproveEon?.("");
        setModeEon?.("APPROVE");
      }

      return hash;
    },
    [
      guardianCommitBlocked,
      operationalReady,
      operationalMsg,
      canWrite,
      publicClient,
      parseUnitsOrZero,
      eonDecimals,
      EVaultAbi,
      v.eonAllowance,
      v.vaultAddress,
      BPS_DENOM,
      SLIPPAGE_BPS,
      GAS_COMMIT,
      sendTx,
      writeContractAsync,
      formatUnitsSafe,
      setStatus,
      setCommitEonIn,
      setApproveEon,
      setModeEon,
      syncAfterConfirmed,
    ]
  );

  return {
    onApproveUsdt0,
    onCommitUsdtForEon,
    onApproveEon,
    onCommitEonForUsdt0,
  };
}