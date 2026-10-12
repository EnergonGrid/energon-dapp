import { useEffect, useState } from "react";

export default function useEmpPricing({
  publicClient,
  v,
  EVaultAbi,
  abiHasFn,
  isAddr,
  subClamp0,
  eonDecimals,
  usdt0Decimals,
}) {
  const [usdtPerEon_1e18, setUsdtPerEon_1e18] = useState(0n);
  const [priceStatus, setPriceStatus] = useState("OFFLINE");

  async function refreshEonPrice() {
    if (!publicClient || !isAddr?.(v?.vaultAddress)) {
      setPriceStatus("OFFLINE");
      return;
    }

    if (abiHasFn(EVaultAbi, "effectiveUsdt0PerEon_1e18")) {
      try {
        const px = await publicClient.readContract({
          address: v.vaultAddress,
          abi: EVaultAbi,
          functionName: "effectiveUsdt0PerEon_1e18",
          args: [],
        });

        if (typeof px === "bigint") {
          setUsdtPerEon_1e18(px);
          setPriceStatus(px > 0n ? "LIVE" : "NO_LIQUIDITY");
          return;
        }

        setPriceStatus("OFFLINE");
        return;
      } catch {
        setPriceStatus("OFFLINE");
        return;
      }
    }

    const eonRes = subClamp0(v?.vaultEonBal ?? 0n, v?.reservedEon ?? 0n);
    const usdtRes = subClamp0(v?.vaultUsdt0Bal ?? 0n, v?.reservedUsdt0 ?? 0n);

    if (eonRes === 0n || usdtRes === 0n) {
      setUsdtPerEon_1e18(0n);
      setPriceStatus("NO_LIQUIDITY");
      return;
    }

    try {
      const uScaled =
        usdt0Decimals === 18
          ? usdtRes
          : usdt0Decimals < 18
          ? usdtRes * 10n ** BigInt(18 - usdt0Decimals)
          : usdtRes / 10n ** BigInt(usdt0Decimals - 18);

      const eScaled =
        eonDecimals === 18
          ? eonRes
          : eonDecimals < 18
          ? eonRes * 10n ** BigInt(18 - eonDecimals)
          : eonRes / 10n ** BigInt(eonDecimals - 18);

      const px = eScaled > 0n ? (uScaled * 10n ** 18n) / eScaled : 0n;

      setUsdtPerEon_1e18(px);
      setPriceStatus(px > 0n ? "LIVE" : "NO_LIQUIDITY");
    } catch {
      setPriceStatus("OFFLINE");
    }
  }

  useEffect(() => {
    refreshEonPrice();
  }, [
    publicClient,
    v?.vaultAddress,
    v?.vaultEonBal,
    v?.vaultUsdt0Bal,
    v?.reservedEon,
    v?.reservedUsdt0,
    eonDecimals,
    usdt0Decimals,
  ]);

  return {
    usdtPerEon_1e18,
    setUsdtPerEon_1e18,
    priceStatus,
    setPriceStatus,
    refreshEonPrice,
  };
}