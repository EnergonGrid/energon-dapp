// Read-only client. Dependencies are injected so failure handling can be tested
// without a wallet, network access, or blockchain transactions.
export function createQoriReader({ rpcUrls, chainId, createBaseCtx, createProvider,
  createCube, createController, formatBurn, formatCountdown, formatDate }) {
  let lastProtocol = {};
  let lastCompleteAt = null;
  let lastBalance = { address: "", value: "-" };
  const pending = new Map();

  function visitor() {
    return { ...createBaseCtx(), guardianState: "VISITOR", protocolEra: "PUBLIC GUIDE",
      readStatus: "PUBLIC GUIDE", walletAddress: "", walletConnected: false };
  }

  async function read(address, walletFailed) {
    const ctx = { ...createBaseCtx(), ...lastProtocol, observedAt: lastCompleteAt,
      readStatus: "UNAVAILABLE", guardianState: address || walletFailed ? "UNKNOWN" : "NO KEY",
      walletAddress: address, walletConnected: !!address,
      cubeBalance: address && lastBalance.address === address ? lastBalance.value : "-" };
    const fields = new Set();
    let balanceVerified = false;
    let complete = false;
    for (const url of rpcUrls) {
      let provider;
      let timeout;
      try {
        provider = createProvider(url);
        // Discard an entire timed-out attempt. Never let late results mutate state.
        const attempt = await Promise.race([
          (async () => {
            if (Number(await provider.send("eth_chainId", [])) !== chainId) throw new Error("Wrong RPC chain");
            const block = await provider.getBlock("latest");
            if (!block) throw new Error("Missing block");
            const opts = { blockTag: block.number };
            const cube = createCube(provider);
            const [controllerResult, balanceResult] = await Promise.allSettled([
              cube.controller(opts),
              address ? cube.balanceOf(address, opts) : Promise.resolve(null),
            ]);
            const values = {};
            let allProtocol = false;
            if (controllerResult.status === "fulfilled") {
              const controller = createController(controllerResult.value, provider);
              const results = await Promise.allSettled([
                controller.energonHeight(opts), controller.secondsUntilNextEnergonBlock(opts),
                controller.burnPoolRemaining(opts), controller.lastHalvingTime(opts),
                controller.halvingInterval(opts),
              ]);
              const [height, tick, burn, last, interval] = results;
              if (height.status === "fulfilled") values.energonHeight = height.value.toString();
              if (tick.status === "fulfilled") values.tickState = Number(tick.value) === 0 ? "TICK ALLOWED" : formatCountdown(Number(tick.value));
              if (burn.status === "fulfilled") values.burnState = formatBurn(burn.value);
              if (last.status === "fulfilled" && interval.status === "fulfilled") {
                const next = Number(last.value) + Number(interval.value);
                values.nextHalvingDate = formatDate(next);
                values.halvingCountdown = formatCountdown(next - block.timestamp);
                values.halvingState = next <= block.timestamp ? "HALVING TIME REACHED" : "ACTIVE CYCLE";
              }
              allProtocol = results.every(r => r.status === "fulfilled");
            }
            return { values, allProtocol, balanceResult, block };
          })(),
          new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("RPC timeout")), 12000); }),
        ]);
        Object.assign(ctx, attempt.values);
        Object.keys(attempt.values).forEach(key => fields.add(key));
        if (address && attempt.balanceResult.status === "fulfilled") {
          const value = attempt.balanceResult.value.toString();
          ctx.cubeBalance = value;
          ctx.guardianState = value === "1" ? "COHERENT" : BigInt(value) > 1n ? "FRACTURED" : "NO KEY";
          lastBalance = { address, value };
          balanceVerified = true;
        }
        if (attempt.allProtocol && (!address || attempt.balanceResult.status === "fulfilled")) {
          complete = true;
          ctx.blockNumber = attempt.block.number;
          ctx.blockTimestamp = attempt.block.timestamp;
          break;
        }
      } catch {
        // Try the next configured Flare RPC. A read error is never a zero balance.
      } finally {
        clearTimeout(timeout);
        provider?.destroy?.();
      }
    }
    if (complete && !walletFailed) {
      ctx.readStatus = "FRESH";
      ctx.observedAt = Date.now();
      lastCompleteAt = ctx.observedAt;
    } else {
      ctx.readStatus = fields.size || balanceVerified ? "PARTIAL" : lastCompleteAt ? "STALE" : "UNAVAILABLE";
    }
    // Only protocol values may be reused across accounts; wallet recognition may not.
    for (const key of fields) lastProtocol[key] = ctx[key];
    return ctx;
  }

  return async ({ landingMode = false, wallet = null } = {}) => {
    if (landingMode) return visitor(); // No RPC and no wallet access in landing mode.
    let address = "";
    let walletFailed = false;
    try {
      const accounts = wallet ? await wallet.request({ method: "eth_accounts" }) : [];
      address = String(accounts?.[0] || "").toLowerCase();
      if (address && !/^0x[0-9a-f]{40}$/.test(address)) throw new Error("Invalid address");
    } catch { address = ""; walletFailed = true; }
    const key = `${address}:${walletFailed}`;
    if (!pending.has(key)) pending.set(key, read(address, walletFailed).finally(() => pending.delete(key)));
    return pending.get(key);
  };
}
