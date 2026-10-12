export default function useEmpActions({
  canWrite,
  setStatus,
  parseUnitsOrZero,
  v,
  GAS_APPROVE,
  GAS_TRANSFER,
  GAS_WITHDRAW_EXECUTE,
  erc20Abi,
  sendTx,
  writeContractAsync,
  EVaultAbi,
  refreshEonPrice,
  refreshVaultState,

  guardianCount,
  guardianThreshold,

  contribReadAccepted,
  setContribReadOpen,
  setContribReadPulse,
  contribAsset,
  contribAmt,
  setContribAmt,
  usdt0Decimals,
  wflrDecimals,
  fxrpAddress,
  fxrpDecimals,
  isAddr,
}) {
  const safeStatus = (msg) => {
    if (typeof setStatus === "function") {
      setStatus(msg);
    }
  };

  const safeRefresh = async () => {
    try {
      if (typeof refreshVaultState === "function") {
        refreshVaultState();
      }
    } catch {}

    try {
      if (typeof refreshEonPrice === "function") {
        await refreshEonPrice();
      }
    } catch {}
  };

  const safeParse = (val, dec) => {
    try {
      return parseUnitsOrZero ? parseUnitsOrZero(val, dec) : 0n;
    } catch {
      return 0n;
    }
  };

  const safeBigInt = (val) => {
    try {
      return typeof val === "bigint" ? val : BigInt(val ?? 0);
    } catch {
      return 0n;
    }
  };

  const thresholdCount = Number(guardianCount ?? 0);
  const thresholdTarget = Number(guardianThreshold ?? 250000);

  const guardianLockMessage = () =>
    `Access locked: guardian threshold not met (${thresholdCount}/${thresholdTarget})`;

  /*
   * Prefer the immutable SYNC_FEE_WFLR value read directly
   * from EVault. Fall back to one whole WFLR if the value
   * has not loaded yet.
   */
  const syncFeeWflr =
    typeof v?.syncFeeWflr === "bigint"
      ? v.syncFeeWflr
      : typeof v?.SYNC_FEE_WFLR === "bigint"
        ? v.SYNC_FEE_WFLR
        : 10n ** BigInt(Number(wflrDecimals ?? 18));

  const wflrAllowance =
    typeof v?.wflrAllowance === "bigint"
      ? v.wflrAllowance
      : safeBigInt(v?.wflrAllowance);

  /*
   * True after the Guardian has approved enough WFLR
   * for EVault to collect the registration fee.
   */
  const guardianEntryAuthorized = wflrAllowance >= syncFeeWflr;

  /*
   * isSyncedGuardian reflects whether the wallet currently owns
   * the exact EnergonCube bound to its Guardian registration.
   */
  const guardianAlreadySynced = Boolean(
    v?.isSyncedGuardian ?? v?.guardianSynced ?? false,
  );

  const guardianCoherent =
    Boolean(v?.isCoherent) && safeBigInt(v?.cubeBalance) === 1n;

  /*
   * ActionsPanel controls the middle labels:
   *
   * Enter as Guardian
   * Verify Guardian
   * Sync Guardian
   * Guardian Registered
   *
   * Therefore this hook supplies only the initial and completed labels.
   */
  const guardianEntryButtonText = guardianAlreadySynced
    ? "Guardian Registered"
    : "Enter as Guardian";

  /**
   * Guardian entry is a two-transaction process:
   *
   * 1. Approve EVault to collect the fixed WFLR sync fee.
   * 2. Call syncGuardian(uint256 cubeId).
   */
  async function onSyncGuardian(selectedCubeId) {
    if (!canWrite) {
      return safeStatus("Guardian entry: wallet not ready");
    }

    if (!isAddr?.(v?.vaultAddress)) {
      return safeStatus("Guardian entry: invalid vault address");
    }

    if (!isAddr?.(v?.wflrAddress)) {
      return safeStatus("Guardian entry: invalid WFLR address");
    }

    if (!guardianCoherent) {
      return safeStatus(
        "Guardian entry requires exactly 1 EnergonCube.",
      );
    }

    if (guardianAlreadySynced) {
      return safeStatus(
        "Guardian already registered with the Cube currently held by this wallet.",
      );
    }

    /*
     * First transaction:
     * approve EVault to collect the Guardian registration fee.
     *
     * The Cube ID is not required for the token approval transaction.
     */
    if (!guardianEntryAuthorized) {
      return sendTx(
        "Verify Guardian",
        () =>
          writeContractAsync({
            address: v.wflrAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [v.vaultAddress, syncFeeWflr],
            gas: GAS_APPROVE,
          }),
        {
          onConfirmed: async () => {
            safeStatus(
              "Guardian verification confirmed. Press Sync Guardian to register this Cube.",
            );

            await safeRefresh();
          },
        },
      );
    }

    /*
     * Second transaction:
     * validate the Cube ID entered in ActionsPanel and submit
     * syncGuardian(uint256 cubeId) to EVault.
     */
    const cubeId = safeBigInt(selectedCubeId);

    if (cubeId < 1n || cubeId > 1000000n) {
      return safeStatus(
        "Guardian entry: Cube ID must be between 1 and 1,000,000.",
      );
    }

    return sendTx(
      `Sync Guardian with Cube #${cubeId.toString()}`,
      () =>
        writeContractAsync({
          address: v.vaultAddress,
          abi: EVaultAbi,
          functionName: "syncGuardian",
          args: [cubeId],
          gas: 220000n,
        }),
      {
        onConfirmed: async () => {
          safeStatus(
            `Cube #${cubeId.toString()} registered. Guardian activation delay started.`,
          );

          await safeRefresh();
        },
      },
    );
  }

  async function onExecuteWithdrawAuthorization(idBig) {
    if (!canWrite) {
      return safeStatus("Execute withdraw: not ready");
    }

    if (!isAddr?.(v?.vaultAddress)) {
      return safeStatus("Execute withdraw: invalid vault address");
    }

    const id = safeBigInt(idBig);

    if (id < 0n) {
      return safeStatus("Execute withdraw: invalid ID");
    }

    return sendTx(
      `Execute withdraw #${id.toString()}`,
      () =>
        writeContractAsync({
          address: v.vaultAddress,
          abi: EVaultAbi,
          functionName: "executeWithdraw",
          args: [id],
          gas: GAS_WITHDRAW_EXECUTE,
        }),
      {
        onConfirmed: async () => {
          await safeRefresh();
        },
      },
    );
  }

  async function onContribute() {
    if (!contribReadAccepted) {
      setContribReadOpen?.(true);
      setContribReadPulse?.(true);

      safeStatus(
        "Acknowledge protocol deposit before continuing.",
      );

      return null;
    }

    if (!canWrite) {
      return safeStatus("Deposit: not ready");
    }

    if (!isAddr?.(v?.vaultAddress)) {
      return safeStatus("Deposit: invalid vault address");
    }

    const asset = String(contribAsset || "").toUpperCase();
    const amtStr = String(contribAmt ?? "").trim();

    let tokenAddr = "";
    let tokenDec = 18;

    if (asset === "USDT0") {
      tokenAddr = v?.usdt0Address;
      tokenDec = usdt0Decimals ?? 6;
    } else if (asset === "EON") {
      tokenAddr = v?.eonAddress;
      tokenDec = Number(v?.eonDecimals ?? 18);
    } else if (asset === "WFLR") {
      tokenAddr = v?.wflrAddress;
      tokenDec = wflrDecimals ?? 18;
    } else if (asset === "FXRP") {
      tokenAddr = fxrpAddress;
      tokenDec = fxrpDecimals ?? 18;
    } else {
      return safeStatus("Deposit: asset not active yet.");
    }

    if (!isAddr?.(tokenAddr)) {
      return safeStatus("Deposit: token address missing");
    }

    const amt = safeParse(amtStr, tokenDec);

    if (amt <= 0n) {
      return safeStatus("Deposit: enter an amount");
    }

    return sendTx(
      `Deposit ${asset}`,
      () =>
        writeContractAsync({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: "transfer",
          args: [v.vaultAddress, amt],
          gas: GAS_TRANSFER,
        }),
      {
        onConfirmed: async () => {
          setContribAmt?.("");
          await safeRefresh();
        },
      },
    );
  }

  return {
    onSyncGuardian,
    onExecuteWithdrawAuthorization,
    onContribute,
    guardianLockMessage,

    syncFeeWflr,
    guardianEntryAuthorized,
    guardianAlreadySynced,
    guardianCoherent,
    guardianEntryButtonText,
  };
}