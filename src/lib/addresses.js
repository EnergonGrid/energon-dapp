import {
  CONTRACT_ADDRESS,
  MAINNET_CHAIN_ID,
  NETWORK_NAME,
  RPCS,
  EON_ADDRESS,
  USDT0_ADDRESS,
  WFLR_ADDRESS,
  FXRP_ADDRESS,
  EVAULT_ADDRESS,
} from "./contract";

function getPrimaryRpc() {
  const value = RPCS?.[MAINNET_CHAIN_ID];

  if (Array.isArray(value)) {
    const first = value.find(Boolean);
    if (first) return first;
  }

  if (typeof value === "string" && value) {
    return value;
  }

  throw new Error("Missing Flare Mainnet RPC");
}

export function getChainKey() {
  return "flare";
}

export function getAddresses() {
  return {
    chain: "flare",
    chainId: MAINNET_CHAIN_ID,
    networkName: NETWORK_NAME,
    rpcUrl: getPrimaryRpc(),

    vault: EVAULT_ADDRESS,
    cube: CONTRACT_ADDRESS,

    eon: EON_ADDRESS,
    usdt0: USDT0_ADDRESS,
    wflr: WFLR_ADDRESS,
    fxrp: FXRP_ADDRESS,

    // Not part of the currently deployed EVault asset set.
    fbtc: "",
    fltc: "",
    fdoge: "",
  };
}
