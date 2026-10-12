import { useEffect, useMemo, useState } from "react";

export default function useEmpCheckpoint({
  publicClient,
  v,
  EVaultAbi,
  abiHasFn,
  isAddr,
  formatUnitsSafe,
}) {
  const [priceCheckpointValue, setPriceCheckpointValue] = useState(0n);
  const [priceCheckpointAt, setPriceCheckpointAt] = useState(0n);
  const [priceWindowSeconds, setPriceWindowSeconds] = useState(3600n);
  const [checkpointNowTs, setCheckpointNowTs] = useState(0n);

  const hasCheckpointFns = useMemo(() => {
    return (
      abiHasFn(EVaultAbi, "currentPriceCheckpoint") ||
      (abiHasFn(EVaultAbi, "lastPriceCheckpointUsdt0PerEon_1e18") &&
        abiHasFn(EVaultAbi, "lastPriceCheckpointAt"))
    );
  }, [EVaultAbi, abiHasFn]);

  useEffect(() => {
    if (!hasCheckpointFns) return;

    let dead = false;

    async function syncCheckpoint() {
      try {
        if (!publicClient || !isAddr(v.vaultAddress)) return;

        const block = await publicClient.getBlock();
        if (!dead) {
          setCheckpointNowTs(
            typeof block?.timestamp === "bigint" ? block.timestamp : 0n
          );
        }

        if (abiHasFn(EVaultAbi, "PRICE_WINDOW_SECONDS")) {
          try {
            const win = await publicClient.readContract({
              address: v.vaultAddress,
              abi: EVaultAbi,
              functionName: "PRICE_WINDOW_SECONDS",
              args: [],
            });
            if (!dead) {
              setPriceWindowSeconds(typeof win === "bigint" ? win : 3600n);
            }
          } catch {}
        }

        if (abiHasFn(EVaultAbi, "currentPriceCheckpoint")) {
          const out = await publicClient.readContract({
            address: v.vaultAddress,
            abi: EVaultAbi,
            functionName: "currentPriceCheckpoint",
            args: [],
          });

          const checkpointPx = typeof out?.[0] === "bigint" ? out[0] : 0n;
          const checkpointAtVal = typeof out?.[1] === "bigint" ? out[1] : 0n;

          if (!dead) {
            setPriceCheckpointValue(checkpointPx);
            setPriceCheckpointAt(checkpointAtVal);
          }
          return;
        }

        const [cpx, cpa] = await Promise.all([
          abiHasFn(EVaultAbi, "lastPriceCheckpointUsdt0PerEon_1e18")
            ? publicClient.readContract({
                address: v.vaultAddress,
                abi: EVaultAbi,
                functionName: "lastPriceCheckpointUsdt0PerEon_1e18",
                args: [],
              })
            : Promise.resolve(0n),
          abiHasFn(EVaultAbi, "lastPriceCheckpointAt")
            ? publicClient.readContract({
                address: v.vaultAddress,
                abi: EVaultAbi,
                functionName: "lastPriceCheckpointAt",
                args: [],
              })
            : Promise.resolve(0n),
        ]);

        if (!dead) {
          setPriceCheckpointValue(typeof cpx === "bigint" ? cpx : 0n);
          setPriceCheckpointAt(typeof cpa === "bigint" ? cpa : 0n);
        }
      } catch {}
    }

    syncCheckpoint();
    const id = setInterval(syncCheckpoint, 2500);

    return () => {
      dead = true;
      clearInterval(id);
    };
  }, [hasCheckpointFns, publicClient, v.vaultAddress, EVaultAbi, abiHasFn, isAddr]);

  const checkpointPriceText = useMemo(() => {
    return priceCheckpointValue > 0n
      ? formatUnitsSafe(priceCheckpointValue, 18, 6)
      : "—";
  }, [priceCheckpointValue, formatUnitsSafe]);

  const checkpointAgeSec = useMemo(() => {
    if (priceCheckpointAt <= 0n || checkpointNowTs <= 0n) return 0n;
    return checkpointNowTs > priceCheckpointAt
      ? checkpointNowTs - priceCheckpointAt
      : 0n;
  }, [priceCheckpointAt, checkpointNowTs]);

  const checkpointResetInSec = useMemo(() => {
    if (priceCheckpointAt <= 0n || checkpointNowTs <= 0n || priceWindowSeconds <= 0n) {
      return 0n;
    }
    const resetAt = priceCheckpointAt + priceWindowSeconds;
    return resetAt > checkpointNowTs ? resetAt - checkpointNowTs : 0n;
  }, [priceCheckpointAt, checkpointNowTs, priceWindowSeconds]);

  return {
    priceCheckpointValue,
    priceCheckpointAt,
    priceWindowSeconds,
    checkpointNowTs,
    checkpointPriceText,
    checkpointAgeSec,
    checkpointResetInSec,
    hasCheckpointFns,
  };
}