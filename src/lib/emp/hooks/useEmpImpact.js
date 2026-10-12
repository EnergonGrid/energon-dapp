import { useCallback, useEffect, useMemo, useState } from "react";

const PRICE_IMPACT_LIMIT_BPS = 2500n;
const PRICE_IMPACT_NEAR_MIN_BPS = 2490n;
const PRICE_IMPACT_NEAR_MAX_BPS = 2499n;

function isAddr(a) {
  return typeof a === "string" && a.startsWith("0x") && a.length === 42;
}

function abiHasFn(abi, name) {
  try {
    const a = Array.isArray(abi) ? abi : abi?.abi;
    if (!Array.isArray(a)) return false;
    return a.some((it) => it && it.type === "function" && it.name === name);
  } catch {
    return false;
  }
}

function minBig(a, b) {
  try {
    return a < b ? a : b;
  } catch {
    return 0n;
  }
}

function rawErrMsg(e) {
  return (
    e?.shortMessage ||
    e?.message ||
    e?.cause?.shortMessage ||
    e?.cause?.message ||
    ""
  );
}

function isPriceImpactErr(e) {
  return String(rawErrMsg(e)).includes("PriceImpactTooHigh");
}

function cleanMaxNote(msg) {
  const s = String(msg || "").trim();
  if (!s) return "";
  if (s.toLowerCase().includes("revert")) return "";
  return s;
}

export default function useEmpImpact({
  publicClient,
  address,
  v,
  EVaultAbi,
  commitUsdtIn,
  commitEonIn,
  usdt0Decimals,
  eonDecimals,
  parseUnitsOrZero,
  formatUnitsSafe,
  operationalReady,
  canWrite,
  modeEon,
  walletEon,
  checkpointNowTs, // harmless to pass even if unused later
  GAS_COMMIT,
}) {
  const [projImpactBpsUsdtToEon, setProjImpactBpsUsdtToEon] = useState(0n);
  const [projImpactNoteUsdtToEon, setProjImpactNoteUsdtToEon] = useState("");

  const [projImpactBpsEonToUsdt, setProjImpactBpsEonToUsdt] = useState(0n);
  const [projImpactNoteEonToUsdt, setProjImpactNoteEonToUsdt] = useState("");

  const [maxEonSafeStr, setMaxEonSafeStr] = useState("");
  const [maxEonBusy, setMaxEonBusy] = useState(false);
  const [maxEonNote, setMaxEonNote] = useState("");

  const refreshProjectedImpactUsdtToEon = useCallback(async () => {
    try {
      setProjImpactNoteUsdtToEon("");

      if (!publicClient || !isAddr(v.vaultAddress)) {
        setProjImpactBpsUsdtToEon(0n);
        return;
      }

      const usdtIn = parseUnitsOrZero(commitUsdtIn, usdt0Decimals);
      if (usdtIn <= 0n) {
        setProjImpactBpsUsdtToEon(0n);
        return;
      }

      if (!abiHasFn(EVaultAbi, "projectedImpactBpsUsdt0ForEon")) {
        setProjImpactBpsUsdtToEon(0n);
        setProjImpactNoteUsdtToEon("");
        return;
      }

      const bps = await publicClient.readContract({
        address: v.vaultAddress,
        abi: EVaultAbi,
        functionName: "projectedImpactBpsUsdt0ForEon",
        args: [usdtIn],
      });

      setProjImpactBpsUsdtToEon(typeof bps === "bigint" ? bps : 0n);
    } catch {
      setProjImpactBpsUsdtToEon(0n);
      setProjImpactNoteUsdtToEon("");
    }
  }, [
    publicClient,
    v.vaultAddress,
    EVaultAbi,
    commitUsdtIn,
    usdt0Decimals,
    parseUnitsOrZero,
  ]);

  const refreshProjectedImpactEonToUsdt = useCallback(async () => {
    try {
      setProjImpactNoteEonToUsdt("");

      if (!publicClient || !isAddr(v.vaultAddress)) {
        setProjImpactBpsEonToUsdt(0n);
        return;
      }

      const eonIn = parseUnitsOrZero(commitEonIn, eonDecimals);
      if (eonIn <= 0n) {
        setProjImpactBpsEonToUsdt(0n);
        return;
      }

      if (!abiHasFn(EVaultAbi, "projectedImpactBpsEonForUsdt0")) {
        setProjImpactBpsEonToUsdt(0n);
        setProjImpactNoteEonToUsdt(
          "Projected impact unavailable (ABI missing projectedImpactBpsEonForUsdt0 — copy fresh EVault.json)."
        );
        return;
      }

      const bps = await publicClient.readContract({
        address: v.vaultAddress,
        abi: EVaultAbi,
        functionName: "projectedImpactBpsEonForUsdt0",
        args: [eonIn],
      });

      setProjImpactBpsEonToUsdt(typeof bps === "bigint" ? bps : 0n);
    } catch {
      setProjImpactBpsEonToUsdt(0n);
      setProjImpactNoteEonToUsdt("Projected impact unavailable.");
    }
  }, [
    publicClient,
    v.vaultAddress,
    EVaultAbi,
    commitEonIn,
    eonDecimals,
    parseUnitsOrZero,
  ]);

  useEffect(() => {
    let dead = false;
    const t = setTimeout(async () => {
      if (dead) return;
      await refreshProjectedImpactUsdtToEon();
    }, 220);
    return () => {
      dead = true;
      clearTimeout(t);
    };
  }, [refreshProjectedImpactUsdtToEon]);

  useEffect(() => {
    let dead = false;
    const t = setTimeout(async () => {
      if (dead) return;
      await refreshProjectedImpactEonToUsdt();
    }, 220);
    return () => {
      dead = true;
      clearTimeout(t);
    };
  }, [refreshProjectedImpactEonToUsdt]);

  const impactTooHighEonToUsdt =
    projImpactBpsEonToUsdt >= PRICE_IMPACT_LIMIT_BPS;

  const impactNearLimitEonToUsdt =
    projImpactBpsEonToUsdt >= PRICE_IMPACT_NEAR_MIN_BPS &&
    projImpactBpsEonToUsdt <= PRICE_IMPACT_NEAR_MAX_BPS;

  const canCommitEonStatic = useCallback(
    async (eonIn) => {
      await publicClient.simulateContract({
        address: v.vaultAddress,
        abi: EVaultAbi,
        functionName: "commitEonForUsdt0",
        args: [eonIn, 0n],
        account: address,
        gas: GAS_COMMIT,
      });
    },
    [publicClient, v.vaultAddress, EVaultAbi, address, GAS_COMMIT]
  );

  const refreshMaxEonSafe = useCallback(async () => {
    if (!publicClient || !isAddr(v.vaultAddress)) return 0n;
    if (!operationalReady) return 0n;
    if (!canWrite || !isAddr(address)) return 0n;

    if (!abiHasFn(EVaultAbi, "commitEonForUsdt0")) {
      setMaxEonSafeStr("");
      setMaxEonNote(
        "Max unavailable (ABI missing commitEonForUsdt0 — update EVault.json)."
      );
      return 0n;
    }

    const upper = minBig(walletEon ?? 0n, v.eonAllowance ?? 0n);

    if (upper <= 0n) {
      setMaxEonSafeStr("");
      setMaxEonNote("Approve EON to compute max.");
      return 0n;
    }

    setMaxEonBusy(true);
    setMaxEonNote("");

    try {
      try {
        await canCommitEonStatic(upper);
        setMaxEonSafeStr(formatUnitsSafe(upper, eonDecimals, 6));
        setMaxEonNote("");
        return upper;
      } catch (eUpper) {
        if (!isPriceImpactErr(eUpper)) {
          setMaxEonSafeStr("");
          setMaxEonNote(cleanMaxNote(rawErrMsg(eUpper)) || "Max unavailable.");
          return 0n;
        }
      }

      try {
        await canCommitEonStatic(1n);
      } catch (eTiny) {
        if (isPriceImpactErr(eTiny)) {
          setMaxEonSafeStr("0");
          setMaxEonNote("");
          return 0n;
        }
        setMaxEonSafeStr("");
        setMaxEonNote(cleanMaxNote(rawErrMsg(eTiny)) || "Max unavailable.");
        return 0n;
      }

      let lo = 0n;
      let hi = upper;
      let nonImpactNote = "";

      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2n;
        if (mid === lo) break;

        try {
          await canCommitEonStatic(mid);
          lo = mid;
        } catch (eMid) {
          if (isPriceImpactErr(eMid)) {
            hi = mid;
            continue;
          }
          nonImpactNote = cleanMaxNote(rawErrMsg(eMid)) || "";
          hi = mid;
        }
      }

      const best = lo;
      setMaxEonSafeStr(formatUnitsSafe(best, eonDecimals, 6));
      setMaxEonNote(nonImpactNote);
      return best;
    } catch (e) {
      setMaxEonSafeStr("");
      setMaxEonNote(cleanMaxNote(rawErrMsg(e)) || "Max unavailable.");
      return 0n;
    } finally {
      setMaxEonBusy(false);
    }
  }, [
    publicClient,
    v.vaultAddress,
    v.eonAllowance,
    EVaultAbi,
    operationalReady,
    canWrite,
    address,
    walletEon,
    canCommitEonStatic,
    formatUnitsSafe,
    eonDecimals,
  ]);

  useEffect(() => {
    if (modeEon !== "COMMIT") return;
    if (!operationalReady) return;
    if (!canWrite) return;

    let dead = false;
    const t = setTimeout(async () => {
      if (dead) return;
      await refreshMaxEonSafe();
    }, 400);

    return () => {
      dead = true;
      clearTimeout(t);
    };
  }, [modeEon, operationalReady, canWrite, refreshMaxEonSafe]);

  const showMaxBefore25 = useMemo(() => {
    const s = String(maxEonSafeStr || "").trim();
    return maxEonBusy || s.length > 0;
  }, [maxEonBusy, maxEonSafeStr]);

  return {
    projImpactBpsUsdtToEon,
    projImpactNoteUsdtToEon,
    projImpactBpsEonToUsdt,
    projImpactNoteEonToUsdt,
    impactTooHighEonToUsdt,
    impactNearLimitEonToUsdt,
    maxEonSafeStr,
    maxEonBusy,
    maxEonNote,
    showMaxBefore25,
    refreshMaxEonSafe,
  };
}