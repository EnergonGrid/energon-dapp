// src/pages/api/metadata/[id].js

const MAX_SUPPLY = 1_000_000;

// 🔒 Pinata image (same for all cubes — your current setup)
const IMAGE_CID =
  "bafybeifigkjd7zwtthgkjnb7pvzdkoufbskr7kevswontsjcaeqbo542vu";

const IMAGE_URL = `https://red-secret-dragonfly-529.mypinata.cloud/ipfs/${IMAGE_CID}`;

// -----------------------------
// Deterministic RNG (pure)
// -----------------------------
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -----------------------------
// Trait pools (from your style)
// -----------------------------
const PLASMA_CORES = [
  "Flare Ember",
  "Azure Arc",
  "Solar Pulse",
  "Crimson Nova",
  "Ion Drift",
];

const BACKGROUNDS = [
  "Black",
  "Midnight",
  "Void",
  "Nebula",
];

// -----------------------------
// Rarity logic (deterministic)
// -----------------------------
function getRarity(rand) {
  const r = rand();
  if (r < 0.01) return "Mythic";
  if (r < 0.05) return "Legendary";
  if (r < 0.20) return "Rare";
  if (r < 0.50) return "Uncommon";
  return "Common";
}

// -----------------------------
// Build attributes
// -----------------------------
function buildAttributes(id) {
  const rand = mulberry32(id);

  const plasmaCore = PLASMA_CORES[Math.floor(rand() * PLASMA_CORES.length)];
  const background = BACKGROUNDS[Math.floor(rand() * BACKGROUNDS.length)];

  const energyOutput = Math.floor(rand() * 50) + 50;
  const powerConsumption = Math.floor(rand() * 60) + 30;
  const turbulence = Math.floor(rand() * 100);
  const overlaySeed = Math.floor(rand() * 100000);

  const density = Math.floor(rand() * 4) + 1;

  const layouts = ["Left", "Center", "Right"];
  const layout = layouts[Math.floor(rand() * layouts.length)];

  const rarity = getRarity(rand);

  return [
    { trait_type: "Plasma Core", value: plasmaCore },
    { trait_type: "Background", value: background },
    { trait_type: "Energy Output", value: `${energyOutput}%` },
    { trait_type: "Power Consumption", value: `${powerConsumption}%` },
    { trait_type: "Plasma Turbulence", value: turbulence },
    { trait_type: "Overlay Seed", value: overlaySeed },
    { trait_type: "Overlay Density", value: density },
    { trait_type: "Overlay Layout", value: layout },
    { trait_type: "Rarity Tier", value: rarity },
  ];
}

// -----------------------------
// Genesis (token 1)
// -----------------------------
function genesisMetadata() {
  return {
    name: "Energon Genesis Cube #1 — The Big Bang",
    description:
      "This Genesis Cube marks the ignition of the Energon Chain. Before this block, Energon time did not exist. With this cube, the Energon Clock was initialized, enabling a permissionless, time-based reward system governed by fairness, scarcity, and decentralization. From this moment forward, Energon blocks advance independently, and rewards are distributed only to wallets holding exactly one Energon Cube.",
    image: IMAGE_URL,
    attributes: [
      { trait_type: "Genesis Type", value: "Big Bang" },
      { trait_type: "Energon Height", value: "0" },
      { trait_type: "Energon Epoch", value: "Genesis" },
      { trait_type: "Energon Block Time", value: "600 seconds" },
      { trait_type: "Clock Authority", value: "Energon Protocol" },
      { trait_type: "Reward Eligibility Rule", value: "Exactly 1 Cube" },
      { trait_type: "Anti-Whale Mechanism", value: "Permanent Disqualification" },
      { trait_type: "Reward Model", value: "Time-Based, Permissionless" },
      { trait_type: "Scarcity Law", value: "Halving Enabled" },
      { trait_type: "Genesis Status", value: "Immutable" },
    ],
  };
}

// -----------------------------
// API handler
// -----------------------------
export default function handler(req, res) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid token id" });
  }

  const tokenId = Number(id);

  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > MAX_SUPPLY) {
    return res.status(404).json({ error: "Token not found" });
  }

  if (tokenId === 1) {
    return res.status(200).json(genesisMetadata());
  }

  const metadata = {
    name: `Energon Cube #${tokenId}`,
    description:
      "Energon Cubes are live Core-reactor nodes — the one million beating hearts of the Energon Grid. Each cube manifests a distinct plasma signature while working in unison to fortify and expand the network's energy field. To hold a Cube is to become a Grid Guardian, entrusted with stabilizing the Plasma flow and shaping the future of decentralized Energon rewards.",
    image: IMAGE_URL,
    attributes: buildAttributes(tokenId),
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=600"
  );

  return res.status(200).json(metadata);
}
