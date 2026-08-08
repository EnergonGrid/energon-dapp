import crypto from "crypto";
import { verifyMessage } from "ethers";

const CUBE_ADDRESS =
  "0x30e1076bDf2B123B54486C2721125388af2d2061".toLowerCase();

const VERIFICATION_MESSAGE =
  "Verify Energon Guardian";

const ALLOWED_ORIGINS = [
  "https://guardian.energon.app",
  "http://localhost:3000",
  "http://localhost:8080",
];

function setCors(req, res) {
  const origin = req.headers.origin;

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );
  }

  res.setHeader("Vary", "Origin");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
}

function padAddress(address) {
  return address
    .toLowerCase()
    .replace("0x", "")
    .padStart(64, "0");
}

function padUint(value) {
  return BigInt(value)
    .toString(16)
    .padStart(64, "0");
}

function decodeAddress(hex) {
  if (!hex || hex === "0x") {
    return "";
  }

  return (
    "0x" +
    hex.slice(-40).toLowerCase()
  );
}

async function rpcCall(to, data) {
  const rpcUrl =
    process.env.FLARE_RPC ||
    process.env.FLR_RPC;

  if (!rpcUrl) {
    throw new Error(
      "Missing FLARE_RPC environment variable."
    );
  }

  const response =
    await fetch(rpcUrl, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          { to, data },
          "latest",
        ],
      }),
    });

  const json =
    await response.json();

  if (
    !response.ok ||
    json.error ||
    !json.result
  ) {
    throw new Error(
      json?.error?.message ||
      "Flare RPC request failed."
    );
  }

  return json.result;
}

async function cubeBalanceOf(wallet) {
  const data =
    "0x70a08231" +
    padAddress(wallet);

  const result =
    await rpcCall(
      CUBE_ADDRESS,
      data
    );

  return BigInt(result);
}

async function ownerOf(cubeId) {
  const data =
    "0x6352211e" +
    padUint(cubeId);

  const result =
    await rpcCall(
      CUBE_ADDRESS,
      data
    );

  return decodeAddress(result);
}

function createGuardianState(
  wallet,
  cubeId,
  secret
) {
  const payload = {
    v: 1,
    wallet,
    cubeId: String(cubeId),
    iat: Date.now(),
    nonce:
      crypto
        .randomBytes(24)
        .toString("hex"),
  };

  const encoded =
    Buffer
      .from(
        JSON.stringify(payload)
      )
      .toString("base64url");

  const signature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(encoded)
      .digest("base64url");

  return `${encoded}.${signature}`;
}

export default async function handler(
  req,
  res
) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const origin =
    req.headers.origin;

  if (
    origin &&
    !ALLOWED_ORIGINS.includes(origin)
  ) {
    return res.status(403).json({
      error: "Origin not allowed.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const {
      wallet,
      cubeId,
      message,
      signature,
    } = req.body || {};

    if (
      !wallet ||
      !/^0x[a-fA-F0-9]{40}$/.test(
        wallet
      )
    ) {
      return res.status(400).json({
        error: "Invalid wallet.",
      });
    }

    if (
      message !==
      VERIFICATION_MESSAGE
    ) {
      return res.status(400).json({
        error:
          "Invalid verification message.",
      });
    }

    if (
      !signature ||
      typeof signature !== "string"
    ) {
      return res.status(400).json({
        error:
          "Missing wallet signature.",
      });
    }

    const cleanCubeId =
      String(cubeId || "").trim();

    if (
      !/^[0-9]+$/.test(cleanCubeId)
    ) {
      return res.status(400).json({
        error:
          "EnergonCube number required.",
      });
    }

    const cubeNumber =
      BigInt(cleanCubeId);

    if (
      cubeNumber < 1n ||
      cubeNumber > 1000000n
    ) {
      return res.status(400).json({
        error:
          "Invalid EnergonCube number.",
      });
    }

    const normalizedWallet =
      wallet.toLowerCase();

    const recoveredAddress =
      verifyMessage(
        message,
        signature
      );

    if (
      recoveredAddress.toLowerCase() !==
      normalizedWallet
    ) {
      return res.status(403).json({
        error:
          "Signature does not match wallet.",
      });
    }

    const balance =
      await cubeBalanceOf(
        normalizedWallet
      );

    if (balance !== 1n) {
      return res.status(403).json({
        coherent: false,
        cubeCount:
          balance.toString(),
        error:
          "Wallet is not a Coherent Guardian.",
      });
    }

    const cubeOwner =
      await ownerOf(cubeNumber);

    if (
      cubeOwner !==
      normalizedWallet
    ) {
      return res.status(403).json({
        error:
          "EnergonCube does not belong to this wallet.",
      });
    }

    const clientId =
      process.env.DISCORD_CLIENT_ID;

    const redirectUri =
      process.env.DISCORD_REDIRECT_URI;

    const sessionSecret =
      process.env.DISCORD_SESSION_SECRET;

    if (
      !clientId ||
      !redirectUri ||
      !sessionSecret
    ) {
      return res.status(500).json({
        error:
          "Discord environment variables are missing.",
      });
    }

    const state =
      createGuardianState(
        normalizedWallet,
        cleanCubeId,
        sessionSecret
      );

    const params =
      new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: "identify",
        state,
      });

    return res.status(200).json({
      ok: true,
      verified: true,
      coherent: true,
      cubeCount: "1",
      wallet:
        normalizedWallet,
      cubeId:
        cleanCubeId,

      authorizeUrl:
        `https://discord.com/oauth2/authorize?${params.toString()}`,
    });
  } catch (error) {
    console.error(
      "Begin Guardian verification error:",
      error
    );

    return res.status(500).json({
      error:
        "Guardian verification could not be started.",
    });
  }
}
