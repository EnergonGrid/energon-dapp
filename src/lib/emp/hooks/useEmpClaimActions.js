export default function useEmpClaimActions({
  canWrite,
  setStatus,
  sendTx,
  writeContractAsync,
  v,
  EVaultAbi,
  GAS_CLAIM,
  refreshEonPrice,
  claimsOpen,
  pastClaimsOpen,
  syncClaimsForWallet,
  syncPastClaimsForWallet,
}) {
  const safeStatus = (msg) => {
    if (typeof setStatus === "function") setStatus(msg);
  };

  const safeRefresh = async () => {
    try {
      if (typeof refreshEonPrice === "function") await refreshEonPrice();
      if (claimsOpen && typeof syncClaimsForWallet === "function") {
        await syncClaimsForWallet();
      }
      if (pastClaimsOpen && typeof syncPastClaimsForWallet === "function") {
        await syncPastClaimsForWallet();
      }
    } catch {}
  };

  const parseId = (idBig) => {
    try {
      return typeof idBig === "bigint" ? idBig : BigInt(idBig);
    } catch {
      return null;
    }
  };

  async function onClaimById(idBig) {
    if (!canWrite) return safeStatus("Claim: not ready");

    const id = parseId(idBig);
    if (id === null || id < 0n) return safeStatus("Claim: invalid id");

    return sendTx(
      `Claim #${id.toString()}`,
      () =>
        writeContractAsync({
          address: v.vaultAddress,
          abi: EVaultAbi,
          functionName: "claim",
          args: [id],
          gas: GAS_CLAIM,
        }),
      {
        onConfirmed: safeRefresh,
      }
    );
  }

  async function onExpireById(idBig) {
    if (!canWrite) return safeStatus("Expire: not ready");

    const id = parseId(idBig);
    if (id === null || id < 0n) return safeStatus("Expire: invalid id");

    return sendTx(
      `Expire #${id.toString()}`,
      () =>
        writeContractAsync({
          address: v.vaultAddress,
          abi: EVaultAbi,
          functionName: "expireClaim",
          args: [id],
          gas: GAS_CLAIM,
        }),
      {
        onConfirmed: safeRefresh,
      }
    );
  }

  return {
    onClaimById,
    onExpireById,
  };
}