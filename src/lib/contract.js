import ABI from "./EnergonCube.json";

// ✅ MAINNET EnergonCube contract
export const CONTRACT_ADDRESS =
  "0x30e1076bDf2B123B54486C2721125388af2d2061";

export { ABI };

// ✅ MAINNET Energon Controller (locked fallback)
export const CONTROLLER_ADDRESS =
  "0xc737bDcA9aFc57a1277480c3DFBF5bdbEcb54BB6";

// ✅ Flare Mainnet
export const MAINNET_CHAIN_ID = 14;

// IMPORTANT: MetaMask expects a 0x-prefixed hex chainId
// 14 decimal = 0x0e
export const MAINNET_HEX = "0x0e";

export const NETWORK_NAME = "Flare Mainnet";

// ✅ EON token contract (mainnet)
export const EON_ADDRESS =
  "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79";

// ✅ EON token logo (Pinata gateway HTTPS URL)
export const EON_LOGO_URI =
  "https://red-secret-dragonfly-529.mypinata.cloud/ipfs/bafybeiccfdp4aez6gqva5yx5cmixc7dugqxl6eee5nhb54sdhpnidpmt7u";

// ✅ Read-only RPC providers
// Used for dashboard/observer reads even before wallet connection
export const RPCS = {
  [MAINNET_CHAIN_ID]: [
    "https://flare-api.flare.network/ext/C/rpc",
    "https://rpc.ankr.com/flare",
    "https://flare.rpc.thirdweb.com",
  ],
};