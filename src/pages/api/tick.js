import { ethers } from "ethers";

/**
 * Energon Mainnet Controller
 */
const CONTROLLER_ADDRESS = "0xc737bDcA9aFc57a1277480c3DFBF5bdbEcb54BB6";

const CONTROLLER_ABI = [
  "function tickEnergon() external",
  "function energonHeight() view returns (uint256)",
  "function secondsUntilNextEnergonBlock() view returns (uint256)",
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = req.headers["x-cron-secret"];
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (!process.env.FLARE_RPC_URL) throw new Error("Missing FLARE_RPC_URL");
    if (!process.env.TICK_PRIVATE_KEY) throw new Error("Missing TICK_PRIVATE_KEY");
    if (!process.env.CRON_SECRET) throw new Error("Missing CRON_SECRET");

    const provider = new ethers.JsonRpcProvider(process.env.FLARE_RPC_URL);
    const wallet = new ethers.Wallet(process.env.TICK_PRIVATE_KEY, provider);

    const controller = new ethers.Contract(
      CONTROLLER_ADDRESS,
      CONTROLLER_ABI,
      wallet
    );

    const tx = await controller.tickEnergon();
    const receipt = await tx.wait();

    const height = await controller.energonHeight();

    return res.status(200).json({
      ok: true,
      tx: tx.hash,
      blockNumber: receipt.blockNumber,
      energonHeight: height.toString(),
    });
  } catch (err) {
    console.error("Tick error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Unknown error",
    });
  }
}