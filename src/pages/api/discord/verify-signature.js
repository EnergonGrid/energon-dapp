import { verifyMessage } from "ethers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const {
      wallet,
      message,
      signature,
    } = req.body || {};

    if (
      !wallet ||
      !/^0x[a-fA-F0-9]{40}$/.test(wallet)
    ) {
      return res.status(400).json({
        error: "Invalid wallet.",
      });
    }

    if (
      !message ||
      typeof message !== "string"
    ) {
      return res.status(400).json({
        error: "Missing verification message.",
      });
    }

    if (
      !signature ||
      typeof signature !== "string"
    ) {
      return res.status(400).json({
        error: "Missing wallet signature.",
      });
    }

    const recoveredAddress =
      verifyMessage(message, signature);

    if (
      recoveredAddress.toLowerCase() !==
      wallet.toLowerCase()
    ) {
      return res.status(403).json({
        verified: false,
        error:
          "Signature does not match wallet.",
      });
    }

    return res.status(200).json({
      verified: true,
      wallet: wallet.toLowerCase(),
      message:
        "Wallet ownership verified.",
    });
  } catch (error) {
    console.error(
      "Wallet signature verification error:",
      error
    );

    return res.status(400).json({
      verified: false,
      error:
        "Invalid wallet signature.",
    });
  }
}
