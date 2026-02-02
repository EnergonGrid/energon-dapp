// energon-dapp/src/lib/controller.js

export const CONTROLLER_ADDRESS = "0xc737bDcA9aFc57a1277480c3DFBF5bdbEcb54BB6";

export const CONTROLLER_ABI = [
  "function eon() view returns (address)",
  "function cube() view returns (address)",
  "function oracle() view returns (address)",
  "function requiredEonPerNft() view returns (uint256)",
  "function currentRewardPerBlock() view returns (uint256)",

  "function lastProcessedBitcoinBlockHeight() view returns (uint256)",
  "function lastBitcoinBlockHash() view returns (bytes32)",

  "function energonHeight() view returns (uint256)",
  "function lastTickTime() view returns (uint256)",

  // UI helpers (you added these)
  "function secondsUntilNextEnergonBlock() view returns (uint256)",
  "function nextEnergonTimestamp() view returns (uint256)",

  "function tickEnergon()",

  "event RewardPaid(address indexed to, uint256 amount, uint256 tokenId)",
  "event EnergonBlockProcessed(uint256 indexed energonHeight, uint256 steps, bytes32 seed)",
  "event BitcoinBlockSubmitted(uint256 indexed height, bytes32 blockHash)",
];