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

// ✅ Official Flare Mainnet assets
export const USDT0_ADDRESS = Object.freeze(
  "0xe7cd86e13AC4309349F30B3435a9d337750fC82D"
);

export const WFLR_ADDRESS = Object.freeze(
  "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d"
);

export const FXRP_ADDRESS = Object.freeze(
  "0xAd552A648C74D49E10027AB8a618A3ad4901c5bE"
);

// ✅ Energon Mainnet ecosystem
export const EVAULT_ADDRESS = Object.freeze(
  "0x4f4C84321f83f77e95359e16f472b130Ed15EF04"
);

export const ENERGON_NETWORK_ADDRESS = Object.freeze(
  "0x6c0bB202a4AF3126E21BbaD6c4D79A8DD41Cc5aC"
);

export const NFT_SYSTEM_ADDRESS = Object.freeze(
  "0xE542801A7F82c5E0D40a02e72EB5d40AB25C067c"
);

export const NODE_REGISTRY_ADDRESS = Object.freeze(
  "0x834F79cdDc43CF231bFe7b1abC622ceF7Cbe14a5"
);

export const NFT_DELIVERY_ADDRESS = Object.freeze(
  "0xe946d9892E54A7F09e373894e8A478aa793bEcB0"
);

export const SERVICE_RESOLUTION_ADDRESS = Object.freeze(
  "0xE24b8f0D1a85b567b565322074A0f157EaE6053A"
);

export const ESTABLISHED_MARK_ADDRESS = Object.freeze(
  "0x28525B92678Bd3AFA5825b45421842bfA46DFdBa"
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

  if (
    USDT0_ADDRESS.toLowerCase() !==
    "0xe7cd86e13ac4309349f30b3435a9d337750fc82d"
  ) {
    throw new Error("USDT0 address mismatch");
  }

  if (
    WFLR_ADDRESS.toLowerCase() !==
    "0x1d80c49bbbcd1c0911346656b529df9e5c2f783d"
  ) {
    throw new Error("WFLR address mismatch");
  }

  if (
    FXRP_ADDRESS.toLowerCase() !==
    "0xad552a648c74d49e10027ab8a618a3ad4901c5be"
  ) {
    throw new Error("FXRP address mismatch");
  }

  if (
    EVAULT_ADDRESS.toLowerCase() !==
    "0x4f4c84321f83f77e95359e16f472b130ed15ef04"
  ) {
    throw new Error("EVault address mismatch");
  }

  if (
    ENERGON_NETWORK_ADDRESS.toLowerCase() !==
    "0x6c0bb202a4af3126e21bbad6c4d79a8dd41cc5ac"
  ) {
    throw new Error("EnergonNetwork address mismatch");
  }

  if (
    NFT_SYSTEM_ADDRESS.toLowerCase() !==
    "0xe542801a7f82c5e0d40a02e72eb5d40ab25c067c"
  ) {
    throw new Error("NFT System address mismatch");
  }

  if (
    NODE_REGISTRY_ADDRESS.toLowerCase() !==
    "0x834f79cddc43cf231bfe7b1abc622cef7cbe14a5"
  ) {
    throw new Error("Node Registry address mismatch");
  }

  if (
    NFT_DELIVERY_ADDRESS.toLowerCase() !==
    "0xe946d9892e54a7f09e373894e8a478aa793becb0"
  ) {
    throw new Error("NFT Delivery address mismatch");
  }

  if (
    SERVICE_RESOLUTION_ADDRESS.toLowerCase() !==
    "0xe24b8f0d1a85b567b565322074a0f157eae6053a"
  ) {
    throw new Error("Service Resolution address mismatch");
  }

  if (
    ESTABLISHED_MARK_ADDRESS.toLowerCase() !==
    "0x28525b92678bd3afa5825b45421842bfa46dfdba"
  ) {
    throw new Error("Established Mark address mismatch");
  }
}

// ✅ Run validation immediately when this file loads
validateProtocolConfig();