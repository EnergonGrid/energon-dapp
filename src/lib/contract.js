import ABI from "./EnergonCube.json";

// ✅ MAINNET EnergonCube contract
export const CONTRACT_ADDRESS = Object.freeze(
  "0x30e1076bDf2B123B54486C2721125388af2d2061"
);

export { ABI };

// ✅ MAINNET Energon Controller
export const CONTROLLER_ADDRESS = Object.freeze(
  "0xc737bDcA9aFc57a1277480c3DFBF5bdbEcb54BB6"
);

// ✅ EON token contract
export const EON_ADDRESS = Object.freeze(
  "0x9458Cbb2e7DafFE6b3cf4d6F2AC75f2d2e0F7d79"
);

// ✅ Flare Mainnet
export const MAINNET_CHAIN_ID = 14;

// ✅ Use unpadded hex for wallet_add / wallet_switch
// 14 decimal = 0xe
export const MAINNET_HEX = "0xe";

export const NETWORK_NAME = "Flare Mainnet";

export const NETWORK = Object.freeze({
  chainId: MAINNET_CHAIN_ID,
  chainHex: MAINNET_HEX,
  name: NETWORK_NAME,
});

// ✅ Protocol constants
export const MAX_CUBE_SUPPLY = 1_000_000;
export const MAX_EON_SUPPLY = 30_000_000;
export const ENERGON_BLOCK_TIME = 600;

export const PROTOCOL = Object.freeze({
  cubeSupply: MAX_CUBE_SUPPLY,
  tokenSupply: MAX_EON_SUPPLY,
  rewardPerMint: 5,
  blockTimeSeconds: ENERGON_BLOCK_TIME,
});

// ✅ EON token logo
export const EON_LOGO_URI = Object.freeze(
  "https://red-secret-dragonfly-529.mypinata.cloud/ipfs/bafybeiccfdp4aez6gqva5yx5cmixc7dugqxl6eee5nhb54sdhpnidpmt7u"
);

// ✅ Explorer helpers
export const FLARESCAN = "https://flarescan.com";

export const EXPLORER_ADDRESS = (address) =>
  `${FLARESCAN}/address/${address}`;

export const EXPLORER_TX = (hash) => `${FLARESCAN}/tx/${hash}`;

// ✅ Read-only RPC providers
export const RPCS = Object.freeze({
  [MAINNET_CHAIN_ID]: Object.freeze([
    "https://flare-api.flare.network/ext/C/rpc",
    "https://rpc.ankr.com/flare",
    "https://flare.rpc.thirdweb.com",
  ]),
});

// ✅ Frontend security validation
export function validateProtocolConfig() {
  if (
    CONTRACT_ADDRESS.toLowerCase() !==
    "0x30e1076bdf2b123b54486c2721125388af2d2061"
  ) {
    throw new Error("EnergonCube address mismatch");
  }

  if (
    CONTROLLER_ADDRESS.toLowerCase() !==
    "0xc737bdca9afc57a1277480c3dfbf5bdbecb54bb6"
  ) {
    throw new Error("Controller address mismatch");
  }

  if (
    EON_ADDRESS.toLowerCase() !==
    "0x9458cbb2e7daffe6b3cf4d6f2ac75f2d2e0f7d79"
  ) {
    throw new Error("EON address mismatch");
  }
}

// ✅ Run validation immediately when this file loads
validateProtocolConfig();