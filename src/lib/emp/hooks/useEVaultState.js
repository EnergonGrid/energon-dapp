import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { getAddresses } from "@/lib/addresses";
import { erc20Abi } from "@/lib/emp/erc20Abi";
import EVaultArtifact from "@/abi/EVault.json";

const EVaultAbi = EVaultArtifact.abi;

function isAddr(a) {
  return typeof a === "string" && a.startsWith("0x") && a.length === 42;
}

function safeStr(x) {
  return x === undefined || x === null ? "—" : String(x);
}

function abiHasFn(abi, name) {
  try {
    const a = Array.isArray(abi) ? abi : abi?.abi;

    if (!Array.isArray(a)) {
      return false;
    }

    return a.some(
      (item) => item && item.type === "function" && item.name === name,
    );
  } catch {
    return false;
  }
}

function subClamp0(a, b) {
  try {
    const x = (a ?? 0n) - (b ?? 0n);
    return x > 0n ? x : 0n;
  } catch {
    return 0n;
  }
}

function pctFloor(numerator, denominator) {
  try {
    if (!denominator || denominator <= 0n) {
      return null;
    }

    return Number((numerator * 10000n) / denominator) / 100;
  } catch {
    return null;
  }
}

export function parseUnitsSafe(value, decimals) {
  const s = String(value ?? "").trim();

  if (!s) {
    return 0n;
  }

  const d = Number(decimals ?? 0);

  if (!Number.isFinite(d) || d < 0) {
    return 0n;
  }

  const neg = s.startsWith("-");
  const raw = neg ? s.slice(1) : s;

  const parts = raw.split(".");
  const w = parts[0] || "0";
  const f = parts[1] || "";

  const whole = BigInt(w);

  const fracRaw = f.slice(0, d);

  const frac = fracRaw ? BigInt(fracRaw.padEnd(d, "0")) : 0n;

  const out = whole * 10n ** BigInt(d) + frac;

  return neg ? -out : out;
}

export function formatUnitsSafe(value, decimals, maxFrac = 6) {
  if (value === undefined || value === null) {
    return "—";
  }

  let v;

  try {
    v = typeof value === "bigint" ? value : BigInt(String(value));
  } catch {
    return "—";
  }

  const d = Number(decimals ?? 0);

  if (!Number.isFinite(d) || d <= 0) {
    return v.toString();
  }

  const neg = v < 0n;
  const abs = neg ? -v : v;

  const base = 10n ** BigInt(d);
  const whole = abs / base;
  const frac = abs % base;

  if (frac === 0n) {
    return (neg ? "-" : "") + whole.toString();
  }

  let fracStr = frac.toString().padStart(d, "0");

  const cut = Math.min(maxFrac, d);

  fracStr = fracStr.slice(0, cut).replace(/0+$/, "");

  return (neg ? "-" : "") + `${whole.toString()}.${fracStr || "0"}`;
}

function deriveHealth({
  activeVaultEonBal,
  activeVaultUsdt0Bal,
  activeVaultWflrBal,
  activeVaultFxrpBal,
  reservedEon,
  reservedUsdt0,
  minEonReserve,
  minUsdt0Reserve,
  minWflrReserve,
  minFxrpReserve,
  requiredEonReserve,
  requiredUsdt0Reserve,
  hasFxrp,
}) {
  const eonBal = activeVaultEonBal ?? 0n;
  const usdtBal = activeVaultUsdt0Bal ?? 0n;
  const wflrBal = activeVaultWflrBal ?? 0n;
  const fxrpBal = activeVaultFxrpBal ?? 0n;

  const resE = reservedEon ?? 0n;
  const resU = reservedUsdt0 ?? 0n;

  const minE = minEonReserve ?? 0n;
  const minU = minUsdt0Reserve ?? 0n;
  const minW = minWflrReserve ?? 0n;
  const minF = minFxrpReserve ?? 0n;

  const reqE = requiredEonReserve ?? minE;
  const reqU = requiredUsdt0Reserve ?? minU;

  const eonFree = subClamp0(eonBal, resE);
  const usdt0Free = subClamp0(usdtBal, resU);

  const vaultEmpty =
    eonBal === 0n &&
    usdtBal === 0n &&
    wflrBal === 0n &&
    (!hasFxrp || fxrpBal === 0n) &&
    resE === 0n &&
    resU === 0n;

  const eonMinMet = eonFree >= reqE;
  const usdt0MinMet = usdt0Free >= reqU;
  const wflrMinMet = wflrBal >= minW;
  const fxrpMinMet = !hasFxrp || fxrpBal >= minF;

  const minimumsMet =
    eonMinMet && usdt0MinMet && wflrMinMet && fxrpMinMet;

  const operationallyLocked = !minimumsMet;

  let operationalLockReason = "";

  if (!eonMinMet) {
    operationalLockReason = "vault reserves below minimum";
  }

  if (!operationalLockReason && !usdt0MinMet) {
    operationalLockReason = "vault reserves below minimum";
  }

  if (!operationalLockReason && !wflrMinMet) {
    operationalLockReason = "vault reserves below minimum";
  }

  if (!operationalLockReason && !fxrpMinMet) {
    operationalLockReason = "vault reserves below minimum";
  }

  const eonCoveragePct = resE > 0n ? pctFloor(eonBal, resE) : null;

  const usdt0CoveragePct = resU > 0n ? pctFloor(usdtBal, resU) : null;

  let coveragePct = null;

  if (eonCoveragePct !== null && usdt0CoveragePct !== null) {
    coveragePct = Math.min(eonCoveragePct, usdt0CoveragePct);
  } else if (eonCoveragePct !== null) {
    coveragePct = eonCoveragePct;
  } else if (usdt0CoveragePct !== null) {
    coveragePct = usdt0CoveragePct;
  }

  let healthLabel = "—";
  let healthTone = "neutral";

  if (vaultEmpty) {
    healthLabel = "EMPTY";
    healthTone = "neutral";
  } else if (operationallyLocked) {
    healthLabel = "LOCKED";
    healthTone = "danger";
  } else if (resE === 0n && resU === 0n) {
    healthLabel = "No active liabilities";
    healthTone = "good";
  } else if (coveragePct !== null) {
    healthLabel = `${coveragePct.toFixed(2)}% coverage`;
    healthTone = coveragePct >= 100 ? "good" : "danger";
  }

  return {
    vaultEmpty,

    eonMinMet,
    usdt0MinMet,
    wflrMinMet,
    fxrpMinMet,

    minimumsMet,

    operationallyLocked,
    operationalLockReason,

    eonCoveragePct,
    usdt0CoveragePct,
    coveragePct,

    healthLabel,
    healthTone,

    requiredEonReserveEffective: reqE,
    requiredUsdt0ReserveEffective: reqU,

    eonFreeEffective: eonFree,
    usdt0FreeEffective: usdt0Free,
  };
}

export function useEVaultState() {
  const addrs = useMemo(() => getAddresses(), []);

  const { address } = useAccount();

  const client = usePublicClient();

  const prevFeeEonRef = useRef(null);
  const prevFeeUsdt0Ref = useRef(null);

  const [refreshNonce, setRefreshNonce] = useState(0);

  const refreshVaultState = useCallback(() => {
    setRefreshNonce((current) => current + 1);
  }, []);

  const [state, setState] = useState({
    enabled: false,

    chain: addrs.chain,
    rpcUrl: addrs.rpcUrl,

    vaultAddress: addrs.vault,
    cubeAddress: addrs.cube,
    eonAddress: addrs.eon,
    usdt0Address: addrs.usdt0,
    wflrAddress: addrs.wflr,

    fxrpAddress: addrs.fxrp || "",
    fxrpSymbol: "FXRP",
    fxrpDecimals: 18,

    rawVaultEonBal: null,
    rawVaultUsdt0Bal: null,
    rawVaultWflrBal: null,
    rawVaultFxrpBal: null,

    vaultEonBal: null,
    vaultUsdt0Bal: null,
    vaultWflrBal: null,
    vaultFxrpBal: null,

    stagedOutEon: 0n,
    stagedOutUsdt0: 0n,
    stagedOutWflr: 0n,
    stagedOutFxrp: 0n,

    activeVaultEonBal: null,
    activeVaultUsdt0Bal: null,
    activeVaultWflrBal: null,
    activeVaultFxrpBal: null,

    reservedEon: null,
    reservedUsdt0: null,

    eonFree: null,
    usdt0Free: null,

    maturitySeconds: null,
    maturityFree24h: null,
    maturityFast12h: null,
    maturityRapid6h: null,

    minEonReserve: null,
    minUsdt0Reserve: null,
    minWflrReserve: null,
    minFxrpReserve: null,

    requiredEonReserve: null,
    requiredUsdt0Reserve: null,

    totalFeesCollectedEon: 0n,
    totalFeesCollectedUsdt0: 0n,

    feesPulseKey: 0,

    eonSymbol: "EON",
    usdt0Symbol: "USDT0",
    wflrSymbol: "WFLR",

    eonDecimals: 18,
    usdt0Decimals: 6,
    wflrDecimals: 18,

    syncFeeWflr: 10n ** 18n,

    eonAllowance: null,
    usdt0Allowance: null,
    wflrAllowance: null,
    fxrpAllowance: null,

    walletNativeBal: null,
    walletEonBal: null,
    walletUsdt0Bal: null,
    walletWflrBal: null,
    walletFxrpBal: null,

    claimsSupported: false,
    claimsLength: null,

    quoteSupported: false,

    quoteUsdt0ToEon: null,
    quoteEonToUsdt0: null,

    quoteLoading: false,
    quoteError: null,

    accessStateSupported: false,

    controller: "",
    pendingController: "",
    pendingControllerActivationTime: 0n,

    withdrawAuthorizationNonce: 0n,
    withdrawAuthorizationsLength: 0n,

    withdrawAuthorizations: [],
    withdrawAuthorizationItems: [],

    isController: false,

    guardianSupported: false,

    cubeBalance: 0n,
    isCoherent: false,

    guardianStatus: null,
    canCommit: null,

    /*
     * Cube currently bound to this wallet by EVault.
     *
     * This is historical/current registration state from:
     * EVault.guardianCubeId(address).
     *
     * It is not automatically used as the Cube ID for a new registration.
     */
    registeredGuardianCubeId: 0n,

    isSyncedGuardian: false,
    guardianAlreadySynced: false,

    guardianSyncedAt: 0n,
    guardianActiveAt: 0n,

    guardianActivationRemaining: 0n,
    guardianActivationActive: false,

    guardianThresholdSupported: false,
    guardianUnlockStatus: null,

    coherentGuardianCount: 0n,
    guardianUnlockThreshold: 250000n,
    guardiansRemainingToUnlock: 250000n,
    guardianThresholdMet: false,

    vaultEmpty: true,

    eonMinMet: false,
    usdt0MinMet: false,
    wflrMinMet: false,
    fxrpMinMet: false,

    minimumsMet: false,

    operationallyLocked: true,
    operationalLockReason: "vault reserves below minimum",

    eonCoveragePct: null,
    usdt0CoveragePct: null,
    coveragePct: null,

    healthLabel: "EMPTY",
    healthTone: "neutral",
  });

  const setQuote = useCallback((patch) => {
    setState((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  useEffect(() => {
    let alive = true;

    let reading = false;

    const safeRead = async (args) => {
      try {
        if (!client) {
          return null;
        }

        return await client.readContract(args);
      } catch {
        return null;
      }
    };

    async function read() {
      if (reading) {
        return;
      }

      reading = true;

      try {
        const enabled =
          !!client &&
          isAddr(addrs.vault) &&
          isAddr(addrs.eon) &&
          isAddr(addrs.usdt0) &&
          isAddr(addrs.wflr);

        if (!enabled) {
          if (alive) {
            setState((current) => ({
              ...current,
              enabled: false,
            }));
          }

          return;
        }

        const fxrpOk = isAddr(addrs.fxrp);

        const vaultEonBal =
          (await safeRead({
            address: addrs.vault,
            abi: EVaultAbi,
            functionName: "eonBalance",
          })) ??
          (await safeRead({
            address: addrs.eon,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [addrs.vault],
          })) ??
          0n;

        const vaultUsdt0Bal =
          (await safeRead({
            address: addrs.vault,
            abi: EVaultAbi,
            functionName: "usdt0Balance",
          })) ??
          (await safeRead({
            address: addrs.usdt0,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [addrs.vault],
          })) ??
          0n;

        const vaultWflrBal =
          (await safeRead({
            address: addrs.vault,
            abi: EVaultAbi,
            functionName: "wflrBalance",
          })) ??
          (await safeRead({
            address: addrs.wflr,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [addrs.vault],
          })) ??
          0n;

        let vaultFxrpBal = null;

        if (fxrpOk) {
          vaultFxrpBal =
            (await safeRead({
              address: addrs.vault,
              abi: EVaultAbi,
              functionName: "fxrpBalance",
            })) ??
            (await safeRead({
              address: addrs.fxrp,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [addrs.vault],
            })) ??
            0n;
        }

        const reservedEon =
          (abiHasFn(EVaultAbi, "reservedEon")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "reservedEon",
              })
            : null) ?? 0n;

        const reservedUsdt0 =
          (abiHasFn(EVaultAbi, "reservedUsdt0")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "reservedUsdt0",
              })
            : null) ?? 0n;

        let eonFree = null;
        let usdt0Free = null;

        if (abiHasFn(EVaultAbi, "freeReserves")) {
          const freeReserves = await safeRead({
            address: addrs.vault,
            abi: EVaultAbi,
            functionName: "freeReserves",
            args: [],
          });

          if (Array.isArray(freeReserves) && freeReserves.length >= 2) {
            eonFree = freeReserves[0] ?? null;
            usdt0Free = freeReserves[1] ?? null;
          }
        }

        const maturityFree24h = abiHasFn(EVaultAbi, "maturitySeconds")
          ? await safeRead({
              address: addrs.vault,
              abi: EVaultAbi,
              functionName: "maturitySeconds",
              args: [0],
            })
          : null;

        const maturityFast12h = abiHasFn(EVaultAbi, "maturitySeconds")
          ? await safeRead({
              address: addrs.vault,
              abi: EVaultAbi,
              functionName: "maturitySeconds",
              args: [1],
            })
          : null;

        const maturityRapid6h = abiHasFn(EVaultAbi, "maturitySeconds")
          ? await safeRead({
              address: addrs.vault,
              abi: EVaultAbi,
              functionName: "maturitySeconds",
              args: [2],
            })
          : null;

        const minEonReserve =
          (abiHasFn(EVaultAbi, "minEonReserve")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "minEonReserve",
              })
            : null) ??
          (abiHasFn(EVaultAbi, "MIN_EON_RESERVE")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "MIN_EON_RESERVE",
              })
            : null) ??
          0n;

        const minUsdt0Reserve =
          (abiHasFn(EVaultAbi, "minUsdt0Reserve")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "minUsdt0Reserve",
              })
            : null) ??
          (abiHasFn(EVaultAbi, "MIN_USDT0_RESERVE")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "MIN_USDT0_RESERVE",
              })
            : null) ??
          0n;

        const minWflrReserve =
          (abiHasFn(EVaultAbi, "minWflrReserve")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "minWflrReserve",
              })
            : null) ??
          (abiHasFn(EVaultAbi, "MIN_WFLR_RESERVE")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "MIN_WFLR_RESERVE",
              })
            : null) ??
          0n;

        const minFxrpReserve = fxrpOk
          ? ((abiHasFn(EVaultAbi, "minFxrpReserve")
              ? await safeRead({
                  address: addrs.vault,
                  abi: EVaultAbi,
                  functionName: "minFxrpReserve",
                })
              : null) ??
            (abiHasFn(EVaultAbi, "MIN_FXRP_RESERVE")
              ? await safeRead({
                  address: addrs.vault,
                  abi: EVaultAbi,
                  functionName: "MIN_FXRP_RESERVE",
                })
              : null) ??
            0n)
          : null;

        const requiredEonReserve =
          (abiHasFn(EVaultAbi, "requiredEonReserve")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "requiredEonReserve",
              })
            : null) ?? minEonReserve;

        const requiredUsdt0Reserve =
          (abiHasFn(EVaultAbi, "requiredUsdt0Reserve")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "requiredUsdt0Reserve",
              })
            : null) ?? minUsdt0Reserve;

        const totalFeesCollectedEon =
          (abiHasFn(EVaultAbi, "totalFeesCollectedEon")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "totalFeesCollectedEon",
              })
            : null) ??
          (abiHasFn(EVaultAbi, "feesCollectedEon")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "feesCollectedEon",
              })
            : null) ??
          (abiHasFn(EVaultAbi, "totalFeesEon")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "totalFeesEon",
              })
            : null) ??
          0n;

        const totalFeesCollectedUsdt0 =
          (abiHasFn(EVaultAbi, "totalFeesCollectedUsdt0")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "totalFeesCollectedUsdt0",
              })
            : null) ??
          (abiHasFn(EVaultAbi, "feesCollectedUsdt0")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "feesCollectedUsdt0",
              })
            : null) ??
          (abiHasFn(EVaultAbi, "totalFeesUsdt0")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "totalFeesUsdt0",
              })
            : null) ??
          0n;

        let feesPulseKeyBump = 0;

        const prevE = prevFeeEonRef.current;
        const prevU = prevFeeUsdt0Ref.current;

        if (prevE !== null && prevU !== null) {
          if (
            totalFeesCollectedEon > prevE ||
            totalFeesCollectedUsdt0 > prevU
          ) {
            feesPulseKeyBump = 1;
          }
        }

        prevFeeEonRef.current = totalFeesCollectedEon;
        prevFeeUsdt0Ref.current = totalFeesCollectedUsdt0;

        const [eonSymbol, wflrSymbol] = await Promise.all([
          safeRead({
            address: addrs.eon,
            abi: erc20Abi,
            functionName: "symbol",
          }),

          safeRead({
            address: addrs.wflr,
            abi: erc20Abi,
            functionName: "symbol",
          }),
        ]);

        const [eonDecimals, usdt0Decimals, wflrDecimals] = await Promise.all([
          safeRead({
            address: addrs.eon,
            abi: erc20Abi,
            functionName: "decimals",
          }),

          safeRead({
            address: addrs.usdt0,
            abi: erc20Abi,
            functionName: "decimals",
          }),

          safeRead({
            address: addrs.wflr,
            abi: erc20Abi,
            functionName: "decimals",
          }),
        ]);

        const normalizedWflrDecimals = Number(wflrDecimals ?? 18);

        const syncFeeWflr =
          (abiHasFn(EVaultAbi, "SYNC_FEE_WFLR")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "SYNC_FEE_WFLR",
              })
            : null) ??
          (abiHasFn(EVaultAbi, "syncFeeWflr")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "syncFeeWflr",
              })
            : null) ??
          10n ** BigInt(normalizedWflrDecimals);

        const [fxrpSymbol, fxrpDecimals] = fxrpOk
          ? await Promise.all([
              safeRead({
                address: addrs.fxrp,
                abi: erc20Abi,
                functionName: "symbol",
              }),

              safeRead({
                address: addrs.fxrp,
                abi: erc20Abi,
                functionName: "decimals",
              }),
            ])
          : [null, null];

        const [eonAllowance, usdt0Allowance, wflrAllowance, fxrpAllowance] =
          address
            ? await Promise.all([
                safeRead({
                  address: addrs.eon,
                  abi: erc20Abi,
                  functionName: "allowance",
                  args: [address, addrs.vault],
                }),

                safeRead({
                  address: addrs.usdt0,
                  abi: erc20Abi,
                  functionName: "allowance",
                  args: [address, addrs.vault],
                }),

                safeRead({
                  address: addrs.wflr,
                  abi: erc20Abi,
                  functionName: "allowance",
                  args: [address, addrs.vault],
                }),

                fxrpOk
                  ? safeRead({
                      address: addrs.fxrp,
                      abi: erc20Abi,
                      functionName: "allowance",
                      args: [address, addrs.vault],
                    })
                  : null,
              ])
            : [null, null, null, null];

        let walletNativeBal = null;

        if (address) {
          try {
            walletNativeBal = await client.getBalance({
              address,
            });
          } catch {
            walletNativeBal = null;
          }
        }

        const [
          walletEonBal,
          walletUsdt0Bal,
          walletWflrBal,
          walletFxrpBal,
        ] = address
          ? await Promise.all([
              safeRead({
                address: addrs.eon,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
              }),

              safeRead({
                address: addrs.usdt0,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
              }),

              safeRead({
                address: addrs.wflr,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
              }),

              fxrpOk
                ? safeRead({
                    address: addrs.fxrp,
                    abi: erc20Abi,
                    functionName: "balanceOf",
                    args: [address],
                  })
                : null,
            ])
          : [null, null, null, null];

        const claimsLength = abiHasFn(EVaultAbi, "claimsLength")
          ? await safeRead({
              address: addrs.vault,
              abi: EVaultAbi,
              functionName: "claimsLength",
            })
          : null;

        const claimsSupported = claimsLength !== null;

        const hasBaseQuoteFns =
          abiHasFn(EVaultAbi, "quoteUsdt0ForEon") &&
          abiHasFn(EVaultAbi, "quoteEonForUsdt0");

        const hasTierQuoteFns =
          abiHasFn(EVaultAbi, "quoteUsdt0ForEonTier") &&
          abiHasFn(EVaultAbi, "quoteEonForUsdt0Tier");

        const quoteSupported = hasBaseQuoteFns || hasTierQuoteFns;

        const accessStateSupported =
          abiHasFn(EVaultAbi, "controller") &&
          abiHasFn(EVaultAbi, "pendingController") &&
          abiHasFn(EVaultAbi, "pendingControllerActivationTime") &&
          (abiHasFn(EVaultAbi, "withdrawAuthorizationNonce") ||
            abiHasFn(EVaultAbi, "withdrawAuthorizationsLength")) &&
          abiHasFn(EVaultAbi, "withdrawAuthorizations");

        let controller = "";
        let pendingController = "";
        let pendingControllerActivationTime = 0n;

        let withdrawAuthorizationNonce = 0n;
        let withdrawAuthorizationsLength = 0n;
        let withdrawAuthorizationItems = [];

        let isController = false;

        let stagedOutEon = 0n;
        let stagedOutUsdt0 = 0n;
        let stagedOutWflr = 0n;
        let stagedOutFxrp = 0n;

        if (accessStateSupported) {
          controller =
            (await safeRead({
              address: addrs.vault,
              abi: EVaultAbi,
              functionName: "controller",
            })) ?? "";

          pendingController =
            (await safeRead({
              address: addrs.vault,
              abi: EVaultAbi,
              functionName: "pendingController",
            })) ?? "";

          pendingControllerActivationTime =
            (await safeRead({
              address: addrs.vault,
              abi: EVaultAbi,
              functionName: "pendingControllerActivationTime",
            })) ?? 0n;

          withdrawAuthorizationNonce =
            (abiHasFn(EVaultAbi, "withdrawAuthorizationNonce")
              ? await safeRead({
                  address: addrs.vault,
                  abi: EVaultAbi,
                  functionName: "withdrawAuthorizationNonce",
                })
              : null) ??
            (abiHasFn(EVaultAbi, "withdrawAuthorizationsLength")
              ? await safeRead({
                  address: addrs.vault,
                  abi: EVaultAbi,
                  functionName: "withdrawAuthorizationsLength",
                })
              : null) ??
            0n;

          withdrawAuthorizationsLength = withdrawAuthorizationNonce;

          isController =
            !!address &&
            isAddr(controller) &&
            controller.toLowerCase() === address.toLowerCase();

          const nonceNum = Number(withdrawAuthorizationNonce ?? 0n);

          if (Number.isFinite(nonceNum) && nonceNum > 0) {
            const reads = Array.from(
              { length: nonceNum },
              async (_, index) => {
                const out = await safeRead({
                  address: addrs.vault,
                  abi: EVaultAbi,
                  functionName: "withdrawAuthorizations",
                  args: [BigInt(index)],
                });

                const token = out?.[0] ?? "";
                const to = out?.[1] ?? "";
                const amount = out?.[2] ?? 0n;
                const notBefore = out?.[3] ?? 0n;
                const executed = out?.[4] === true;
                const cancelled = out?.[5] === true;

                const exists =
                  typeof out?.[6] === "boolean"
                    ? out[6]
                    : !!(
                        token ||
                        to ||
                        amount > 0n ||
                        notBefore > 0n ||
                        executed ||
                        cancelled
                      );

                let amountFormatted = "—";

                if (exists && isAddr(token)) {
                  let decimals = 18;
                  let symbol = "";

                  if (
                    token.toLowerCase() ===
                    String(addrs.eon || "").toLowerCase()
                  ) {
                    decimals = Number(eonDecimals ?? 18);

                    symbol = safeStr(eonSymbol) !== "—" ? eonSymbol : "EON";
                  } else if (
                    token.toLowerCase() ===
                    String(addrs.usdt0 || "").toLowerCase()
                  ) {
                    decimals = Number(usdt0Decimals ?? 6);
                    symbol = "USDT0";
                  } else if (
                    token.toLowerCase() ===
                    String(addrs.wflr || "").toLowerCase()
                  ) {
                    decimals = Number(wflrDecimals ?? 18);

                    symbol = safeStr(wflrSymbol) !== "—" ? wflrSymbol : "WFLR";
                  } else if (
                    fxrpOk &&
                    token.toLowerCase() ===
                      String(addrs.fxrp || "").toLowerCase()
                  ) {
                    decimals = Number(fxrpDecimals ?? 18);

                    symbol = safeStr(fxrpSymbol) !== "—" ? fxrpSymbol : "FXRP";
                  }

                  amountFormatted = `${formatUnitsSafe(amount, decimals)}${
                    symbol ? ` ${symbol}` : ""
                  }`;
                }

                return {
                  id: BigInt(index),
                  token,
                  to,
                  amount,
                  amountFormatted,
                  notBefore,
                  executed,
                  cancelled,
                  exists,
                };
              },
            );

            withdrawAuthorizationItems = (await Promise.all(reads))
              .filter((item) => item && item.exists)
              .sort((a, b) => {
                if (a.id > b.id) return -1;
                if (a.id < b.id) return 1;
                return 0;
              });

            for (const item of withdrawAuthorizationItems) {
              const isOutstanding =
                item?.exists === true &&
                item?.executed !== true &&
                item?.cancelled !== true &&
                (item?.amount ?? 0n) > 0n;

              if (!isOutstanding) {
                continue;
              }

              const tokenLc = String(item.token || "").toLowerCase();

              if (
                tokenLc === String(addrs.eon || "").toLowerCase()
              ) {
                stagedOutEon += item.amount;
              } else if (
                tokenLc === String(addrs.usdt0 || "").toLowerCase()
              ) {
                stagedOutUsdt0 += item.amount;
              } else if (
                tokenLc === String(addrs.wflr || "").toLowerCase()
              ) {
                stagedOutWflr += item.amount;
              } else if (
                fxrpOk &&
                tokenLc === String(addrs.fxrp || "").toLowerCase()
              ) {
                stagedOutFxrp += item.amount;
              }
            }
          }
        }

        const rawVaultEonBal =
          (abiHasFn(EVaultAbi, "rawEonBalance")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "rawEonBalance",
              })
            : null) ??
          vaultEonBal ??
          0n;

        const rawVaultUsdt0Bal =
          (abiHasFn(EVaultAbi, "rawUsdt0Balance")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "rawUsdt0Balance",
              })
            : null) ??
          vaultUsdt0Bal ??
          0n;

        const rawVaultWflrBal =
          (abiHasFn(EVaultAbi, "rawWflrBalance")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "rawWflrBalance",
              })
            : null) ??
          vaultWflrBal ??
          0n;

        const rawVaultFxrpBal = fxrpOk
          ? ((abiHasFn(EVaultAbi, "rawFxrpBalance")
              ? await safeRead({
                  address: addrs.vault,
                  abi: EVaultAbi,
                  functionName: "rawFxrpBalance",
                })
              : null) ??
            vaultFxrpBal ??
            0n)
          : null;

        const activeVaultEonBal = subClamp0(
          rawVaultEonBal,
          stagedOutEon,
        );

        const activeVaultUsdt0Bal = subClamp0(
          rawVaultUsdt0Bal,
          stagedOutUsdt0,
        );

        const activeVaultWflrBal = subClamp0(
          rawVaultWflrBal,
          stagedOutWflr,
        );

        const activeVaultFxrpBal = subClamp0(
          rawVaultFxrpBal ?? 0n,
          stagedOutFxrp,
        );

        const computedEonFree = subClamp0(
          activeVaultEonBal,
          reservedEon,
        );

        const computedUsdt0Free = subClamp0(
          activeVaultUsdt0Bal,
          reservedUsdt0,
        );

        eonFree =
          typeof eonFree === "bigint" ? eonFree : computedEonFree;

        usdt0Free =
          typeof usdt0Free === "bigint" ? usdt0Free : computedUsdt0Free;

        const guardianSupported =
          !!address &&
          (abiHasFn(EVaultAbi, "guardianStatus") ||
            abiHasFn(EVaultAbi, "cubeBalanceOf") ||
            abiHasFn(EVaultAbi, "isCoherent"));

        const guardianStatus =
          !!address && abiHasFn(EVaultAbi, "guardianStatus")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "guardianStatus",
                args: [address],
              })
            : null;

        const cubeBalance =
          (guardianStatus && Array.isArray(guardianStatus)
            ? guardianStatus[0]
            : null) ??
          (!!address && abiHasFn(EVaultAbi, "cubeBalanceOf")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "cubeBalanceOf",
                args: [address],
              })
            : null) ??
          0n;

        const contractCoherent =
          (guardianStatus && Array.isArray(guardianStatus)
            ? Boolean(guardianStatus[1])
            : null) ??
          (!!address && abiHasFn(EVaultAbi, "isCoherent")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "isCoherent",
                args: [address],
              })
            : null) ??
          false;

        const isCoherent =
          Boolean(contractCoherent) && cubeBalance === 1n;

        const canCommit =
          !!address && abiHasFn(EVaultAbi, "canCommit")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "canCommit",
                args: [address],
              })
            : null;

        const guardianRegistrationStatus =
          !!address &&
          abiHasFn(EVaultAbi, "guardianRegistrationStatus")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "guardianRegistrationStatus",
                args: [address],
              })
            : null;

        /*
         * Reads the Cube already bound to the wallet inside EVault.
         *
         * Zero means the wallet has no previous EVault Cube binding.
         *
         * This value must not automatically be used as the Cube ID for
         * a new registration after a Cube transfer.
         */
        const registeredGuardianCubeId =
          !!address && abiHasFn(EVaultAbi, "guardianCubeId")
            ? ((await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "guardianCubeId",
                args: [address],
              })) ?? 0n)
            : 0n;

        const isSyncedGuardianDirect =
          !!address && abiHasFn(EVaultAbi, "isSyncedGuardian")
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "isSyncedGuardian",
                args: [address],
              })
            : null;

        const guardianAlreadySynced = Array.isArray(
          guardianRegistrationStatus,
        )
          ? Boolean(guardianRegistrationStatus[0])
          : Boolean(isSyncedGuardianDirect ?? false);

        const guardianSyncedAt = Array.isArray(
          guardianRegistrationStatus,
        )
          ? guardianRegistrationStatus[1] ?? 0n
          : 0n;

        const guardianActiveAt = Array.isArray(
          guardianRegistrationStatus,
        )
          ? guardianRegistrationStatus[2] ?? 0n
          : 0n;

        const guardianActivationRemaining = Array.isArray(
          guardianRegistrationStatus,
        )
          ? guardianRegistrationStatus[3] ?? 0n
          : 0n;

        const guardianActivationActive = Array.isArray(
          guardianRegistrationStatus,
        )
          ? Boolean(guardianRegistrationStatus[4])
          : false;

        const guardianThresholdSupported =
          abiHasFn(EVaultAbi, "guardianUnlockStatus") ||
          abiHasFn(EVaultAbi, "coherentGuardianCount") ||
          abiHasFn(EVaultAbi, "guardianThresholdMet") ||
          abiHasFn(EVaultAbi, "guardiansRemainingToUnlock");

        let guardianUnlockStatus = null;
        let coherentGuardianCount = 0n;
        let guardianUnlockThreshold = 250000n;
        let guardiansRemainingToUnlock = 250000n;
        let guardianThresholdMet = false;

        if (guardianThresholdSupported) {
          guardianUnlockStatus = abiHasFn(
            EVaultAbi,
            "guardianUnlockStatus",
          )
            ? await safeRead({
                address: addrs.vault,
                abi: EVaultAbi,
                functionName: "guardianUnlockStatus",
              })
            : null;

          if (
            Array.isArray(guardianUnlockStatus) &&
            guardianUnlockStatus.length >= 4
          ) {
            coherentGuardianCount = guardianUnlockStatus[0] ?? 0n;

            guardianUnlockThreshold =
              guardianUnlockStatus[1] ?? 250000n;

            guardiansRemainingToUnlock =
              guardianUnlockStatus[2] ?? 0n;

            guardianThresholdMet = Boolean(
              guardianUnlockStatus[3] ?? false,
            );
          } else {
            coherentGuardianCount =
              (abiHasFn(EVaultAbi, "coherentGuardianCount")
                ? await safeRead({
                    address: addrs.vault,
                    abi: EVaultAbi,
                    functionName: "coherentGuardianCount",
                  })
                : null) ?? 0n;

            guardiansRemainingToUnlock =
              (abiHasFn(EVaultAbi, "guardiansRemainingToUnlock")
                ? await safeRead({
                    address: addrs.vault,
                    abi: EVaultAbi,
                    functionName: "guardiansRemainingToUnlock",
                  })
                : null) ?? 0n;

            guardianThresholdMet =
              (abiHasFn(EVaultAbi, "guardianThresholdMet")
                ? await safeRead({
                    address: addrs.vault,
                    abi: EVaultAbi,
                    functionName: "guardianThresholdMet",
                  })
                : null) ?? false;

            guardianUnlockThreshold =
              guardiansRemainingToUnlock > 0n
                ? coherentGuardianCount + guardiansRemainingToUnlock
                : 250000n;

            guardianUnlockStatus = [
              coherentGuardianCount,
              guardianUnlockThreshold,
              guardiansRemainingToUnlock,
              guardianThresholdMet,
            ];
          }
        }

        guardianThresholdMet =
          Boolean(guardianThresholdMet) ||
          coherentGuardianCount >= guardianUnlockThreshold;

        const health = deriveHealth({
          activeVaultEonBal,
          activeVaultUsdt0Bal,
          activeVaultWflrBal,
          activeVaultFxrpBal,

          reservedEon,
          reservedUsdt0,

          minEonReserve,
          minUsdt0Reserve,
          minWflrReserve,
          minFxrpReserve,

          requiredEonReserve,
          requiredUsdt0Reserve,

          hasFxrp: fxrpOk,
        });

        if (!alive) {
          return;
        }

        setState((previous) => ({
          ...previous,

          enabled: true,

          chain: addrs.chain,
          rpcUrl: addrs.rpcUrl,

          vaultAddress: addrs.vault,
          cubeAddress: addrs.cube,
          eonAddress: addrs.eon,
          usdt0Address: addrs.usdt0,
          wflrAddress: addrs.wflr,

          fxrpAddress: addrs.fxrp || "",

          fxrpSymbol:
            safeStr(fxrpSymbol) !== "—" ? fxrpSymbol : "FXRP",

          fxrpDecimals: fxrpDecimals ?? 18,

          rawVaultEonBal,
          rawVaultUsdt0Bal,
          rawVaultWflrBal,
          rawVaultFxrpBal,

          vaultEonBal: activeVaultEonBal,
          vaultUsdt0Bal: activeVaultUsdt0Bal,
          vaultWflrBal: activeVaultWflrBal,
          vaultFxrpBal: activeVaultFxrpBal,

          stagedOutEon,
          stagedOutUsdt0,
          stagedOutWflr,
          stagedOutFxrp,

          activeVaultEonBal,
          activeVaultUsdt0Bal,
          activeVaultWflrBal,
          activeVaultFxrpBal,

          reservedEon,
          reservedUsdt0,

          eonFree: health.eonFreeEffective ?? eonFree,

          usdt0Free: health.usdt0FreeEffective ?? usdt0Free,

          maturitySeconds: maturityFree24h,

          maturityFree24h,
          maturityFast12h,
          maturityRapid6h,

          minEonReserve,
          minUsdt0Reserve,
          minWflrReserve,
          minFxrpReserve,

          requiredEonReserve,
          requiredUsdt0Reserve,

          totalFeesCollectedEon,
          totalFeesCollectedUsdt0,

          feesPulseKey:
            previous.feesPulseKey + feesPulseKeyBump,

          eonSymbol:
            safeStr(eonSymbol) !== "—" ? eonSymbol : "EON",

          usdt0Symbol: "USDT0",

          wflrSymbol:
            safeStr(wflrSymbol) !== "—" ? wflrSymbol : "WFLR",

          eonDecimals: eonDecimals ?? 18,
          usdt0Decimals: usdt0Decimals ?? 6,
          wflrDecimals: wflrDecimals ?? 18,

          syncFeeWflr,

          eonAllowance,
          usdt0Allowance,
          wflrAllowance,
          fxrpAllowance,

          walletNativeBal,
          walletEonBal,
          walletUsdt0Bal,
          walletWflrBal,
          walletFxrpBal,

          claimsSupported,
          claimsLength,

          quoteSupported,

          accessStateSupported,

          controller,
          pendingController,
          pendingControllerActivationTime,

          withdrawAuthorizationNonce,
          withdrawAuthorizationsLength,

          withdrawAuthorizations: withdrawAuthorizationItems,
          withdrawAuthorizationItems,

          isController,

          guardianSupported,

          cubeBalance,
          isCoherent,

          guardianStatus,
          canCommit,

          registeredGuardianCubeId,

          isSyncedGuardian: guardianAlreadySynced,
          guardianAlreadySynced,

          guardianSyncedAt,
          guardianActiveAt,

          guardianActivationRemaining,
          guardianActivationActive,

          guardianThresholdSupported,
          guardianUnlockStatus,

          coherentGuardianCount,
          guardianUnlockThreshold,
          guardiansRemainingToUnlock,
          guardianThresholdMet,

          vaultEmpty: health.vaultEmpty,

          eonMinMet: health.eonMinMet,
          usdt0MinMet: health.usdt0MinMet,
          wflrMinMet: health.wflrMinMet,
          fxrpMinMet: health.fxrpMinMet,

          minimumsMet: health.minimumsMet,

          operationallyLocked: health.operationallyLocked,

          operationalLockReason:
            health.operationalLockReason,

          eonCoveragePct: health.eonCoveragePct,
          usdt0CoveragePct: health.usdt0CoveragePct,
          coveragePct: health.coveragePct,

          healthLabel: health.healthLabel,
          healthTone: health.healthTone,
        }));
      } finally {
        reading = false;
      }
    }

    read();

    const intervalId = setInterval(read, 30000);

    return () => {
      alive = false;
      clearInterval(intervalId);
    };
  }, [
    client,

    addrs.vault,
    addrs.cube,
    addrs.eon,
    addrs.usdt0,
    addrs.wflr,
    addrs.fxrp,

    addrs.chain,
    addrs.rpcUrl,

    address,
    refreshNonce,
  ]);

  const quoteUsdt0ForEon = useCallback(
    async (usdtInRawOrHuman, maturityTier = 0) => {
      if (
        !client ||
        !isAddr(state.vaultAddress) ||
        !state.quoteSupported
      ) {
        setQuote({
          quoteLoading: false,
          quoteError: "Quotes not available",
          quoteUsdt0ToEon: null,
        });

        return null;
      }

      const usdtDecimals = Number(state.usdt0Decimals ?? 6);

      let usdtIn;

      try {
        usdtIn =
          typeof usdtInRawOrHuman === "bigint"
            ? usdtInRawOrHuman
            : parseUnitsSafe(usdtInRawOrHuman, usdtDecimals);
      } catch {
        setQuote({
          quoteLoading: false,
          quoteError: "Invalid amount",
          quoteUsdt0ToEon: null,
        });

        return null;
      }

      if (!usdtIn || usdtIn <= 0n) {
        setQuote({
          quoteLoading: false,
          quoteError: null,
          quoteUsdt0ToEon: null,
        });

        return null;
      }

      setQuote({
        quoteLoading: true,
        quoteError: null,
      });

      try {
        const hasTierQuote = abiHasFn(
          EVaultAbi,
          "quoteUsdt0ForEonTier",
        );

        const hasBaseQuote = abiHasFn(
          EVaultAbi,
          "quoteUsdt0ForEon",
        );

        if (!hasTierQuote && !hasBaseQuote) {
          throw new Error("Quote function unavailable");
        }

        const tier = Number(maturityTier ?? 0);

        const result = await client.readContract({
          address: state.vaultAddress,
          abi: EVaultAbi,

          functionName: hasTierQuote
            ? "quoteUsdt0ForEonTier"
            : "quoteUsdt0ForEon",

          args: hasTierQuote ? [usdtIn, tier] : [usdtIn],
        });

        const outNet = Array.isArray(result)
          ? result[0] ?? 0n
          : 0n;

        const feeIn = Array.isArray(result)
          ? result[1] ?? 0n
          : 0n;

        const feeOut = Array.isArray(result)
          ? result[2] ?? 0n
          : 0n;

        const maturityFeeOut = Array.isArray(result)
          ? result[3] ?? 0n
          : 0n;

        const unlockDelay = Array.isArray(result)
          ? result[4] ?? 0n
          : 0n;

        const quote = {
          outNet,
          feeIn,
          feeOut,
          maturityFeeOut,
          unlockDelay,

          inAmount: usdtIn,
          maturityTier: tier,
        };

        setQuote({
          quoteUsdt0ToEon: quote,
          quoteLoading: false,
          quoteError: null,
        });

        return quote;
      } catch {
        setQuote({
          quoteLoading: false,
          quoteError: "Couldn’t fetch quote (check reserves).",
          quoteUsdt0ToEon: null,
        });

        return null;
      }
    },
    [
      client,
      state.vaultAddress,
      state.quoteSupported,
      state.usdt0Decimals,
      setQuote,
    ],
  );

  const quoteEonForUsdt0 = useCallback(
    async (eonInRawOrHuman, maturityTier = 0) => {
      if (
        !client ||
        !isAddr(state.vaultAddress) ||
        !state.quoteSupported
      ) {
        setQuote({
          quoteLoading: false,
          quoteError: "Quotes not available",
          quoteEonToUsdt0: null,
        });

        return null;
      }

      const eonDecimals = Number(state.eonDecimals ?? 18);

      let eonIn;

      try {
        eonIn =
          typeof eonInRawOrHuman === "bigint"
            ? eonInRawOrHuman
            : parseUnitsSafe(eonInRawOrHuman, eonDecimals);
      } catch {
        setQuote({
          quoteLoading: false,
          quoteError: "Invalid amount",
          quoteEonToUsdt0: null,
        });

        return null;
      }

      if (!eonIn || eonIn <= 0n) {
        setQuote({
          quoteLoading: false,
          quoteError: null,
          quoteEonToUsdt0: null,
        });

        return null;
      }

      setQuote({
        quoteLoading: true,
        quoteError: null,
      });

      try {
        const hasTierQuote = abiHasFn(
          EVaultAbi,
          "quoteEonForUsdt0Tier",
        );

        const hasBaseQuote = abiHasFn(
          EVaultAbi,
          "quoteEonForUsdt0",
        );

        if (!hasTierQuote && !hasBaseQuote) {
          throw new Error("Quote function unavailable");
        }

        const tier = Number(maturityTier ?? 0);

        const result = await client.readContract({
          address: state.vaultAddress,
          abi: EVaultAbi,

          functionName: hasTierQuote
            ? "quoteEonForUsdt0Tier"
            : "quoteEonForUsdt0",

          args: hasTierQuote ? [eonIn, tier] : [eonIn],
        });

        const outNet = Array.isArray(result)
          ? result[0] ?? 0n
          : 0n;

        const feeIn = Array.isArray(result)
          ? result[1] ?? 0n
          : 0n;

        const feeOut = Array.isArray(result)
          ? result[2] ?? 0n
          : 0n;

        const maturityFeeOut = Array.isArray(result)
          ? result[3] ?? 0n
          : 0n;

        const unlockDelay = Array.isArray(result)
          ? result[4] ?? 0n
          : 0n;

        const quote = {
          outNet,
          feeIn,
          feeOut,
          maturityFeeOut,
          unlockDelay,

          inAmount: eonIn,
          maturityTier: tier,
        };

        setQuote({
          quoteEonToUsdt0: quote,
          quoteLoading: false,
          quoteError: null,
        });

        return quote;
      } catch {
        setQuote({
          quoteLoading: false,
          quoteError: "Couldn’t fetch quote (check reserves).",
          quoteEonToUsdt0: null,
        });

        return null;
      }
    },
    [
      client,
      state.vaultAddress,
      state.quoteSupported,
      state.eonDecimals,
      setQuote,
    ],
  );

  const feesPulseStyle = useMemo(
    () => ({
      animation: state.feesPulseKey
        ? "empFeePulse 420ms ease-out"
        : "none",

      willChange: "filter, transform",
    }),
    [state.feesPulseKey],
  );

  return {
    ...state,

    quoteUsdt0ForEon,
    quoteEonForUsdt0,

    refreshVaultState,

    feesPulseStyle,
  };
}