import crypto from "crypto";
import { verifyMessage } from "ethers";

const CUBE_ADDRESS =
  "0x30e1076bDf2B123B54486C2721125388af2d2061".toLowerCase();

const DISCORD_PROOF_MAX_AGE_MS =
  10 * 60 * 1000;

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

    res.setHeader(
      "Access-Control-Allow-Credentials",
      "true"
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

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");

        return [
          decodeURIComponent(
            part.slice(0, index)
          ),
          decodeURIComponent(
            part.slice(index + 1)
          ),
        ];
      })
  );
}

function safeEqualHex(a, b) {
  try {
    const aBuffer =
      Buffer.from(a, "hex");

    const bBuffer =
      Buffer.from(b, "hex");

    if (
      aBuffer.length === 0 ||
      aBuffer.length !== bBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      aBuffer,
      bBuffer
    );
  } catch {
    return false;
  }
}

function getDiscordUserIdFromSession(
  session,
  secret
) {
  if (!session || !secret) {
    return null;
  }

  const separator =
    session.lastIndexOf(".");

  if (separator <= 0) {
    return null;
  }

  const discordUserId =
    session.slice(0, separator);

  const suppliedSignature =
    session.slice(separator + 1);

  if (!/^[0-9]+$/.test(discordUserId)) {
    return null;
  }

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(discordUserId)
      .digest("hex");

  if (
    !safeEqualHex(
      suppliedSignature,
      expectedSignature
    )
  ) {
    return null;
  }

  return discordUserId;
}

function getDiscordUserIdFromProof(
  proof,
  secret
) {
  if (
    !proof ||
    typeof proof !== "string" ||
    !secret
  ) {
    return null;
  }

  const parts =
    proof.split(".");

  if (parts.length !== 4) {
    return null;
  }

  const [
    discordUserId,
    timestamp,
    nonce,
    suppliedSignature,
  ] = parts;

  if (
    !/^[0-9]+$/.test(discordUserId) ||
    !/^[0-9]+$/.test(timestamp) ||
    !/^[a-f0-9]+$/i.test(nonce) ||
    !/^[a-f0-9]+$/i.test(
      suppliedSignature
    )
  ) {
    return null;
  }

  const createdAt =
    Number(timestamp);

  if (
    !Number.isFinite(createdAt) ||
    Date.now() - createdAt >
      DISCORD_PROOF_MAX_AGE_MS ||
    createdAt - Date.now() >
      60 * 1000
  ) {
    return null;
  }

  const payload =
    `${discordUserId}.${timestamp}.${nonce}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(payload)
      .digest("hex");

  if (
    !safeEqualHex(
      suppliedSignature,
      expectedSignature
    )
  ) {
    return null;
  }

  return discordUserId;
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
          {
            to,
            data,
          },
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

async function assignGuardianRole(
  discordUserId
) {
  const botToken =
    process.env.DISCORD_BOT_TOKEN;

  const guildId =
    process.env.DISCORD_GUILD_ID;

  const guardianRoleId =
    process.env.DISCORD_GUARDIAN_ROLE_ID;

  if (
    !botToken ||
    !guildId ||
    !guardianRoleId
  ) {
    throw new Error(
      "Discord role environment variables are missing."
    );
  }

  const response =
    await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${guardianRoleId}`,
      {
        method: "PUT",

        headers: {
          Authorization:
            `Bot ${botToken}`,
        },
      }
    );

  if (response.status === 204) {
    return;
  }

  const errorText =
    await response.text();

  throw new Error(
    `Discord role assignment failed (${response.status}): ${errorText}`
  );
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
      error:
        "Origin not allowed.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error:
        "Method not allowed.",
    });
  }

  try {
    const sessionSecret =
      process.env.DISCORD_SESSION_SECRET;

    if (!sessionSecret) {
      return res.status(500).json({
        verified: false,
        error:
          "Discord session secret is missing.",
      });
    }

    const {
      wallet,
      message,
      signature,
      proof,
    } = req.body || {};

    const cookies =
      parseCookies(
        req.headers.cookie || ""
      );

    const discordUserId =
      getDiscordUserIdFromProof(
        proof,
        sessionSecret
      ) ||
      getDiscordUserIdFromSession(
        cookies.discord_session,
        sessionSecret
      );

    if (!discordUserId) {
      return res.status(401).json({
        verified: false,
        error:
          "Discord authentication required.",
      });
    }

    if (
      !wallet ||
      !/^0x[a-fA-F0-9]{40}$/.test(
        wallet
      )
    ) {
      return res.status(400).json({
        error:
          "Invalid wallet.",
      });
    }

    if (
      !message ||
      typeof message !== "string"
    ) {
      return res.status(400).json({
        error:
          "Missing verification message.",
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
        verified: false,
        walletVerified: false,
        coherent: false,
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
        verified: false,
        walletVerified: true,
        coherent: false,
        cubeCount:
          balance.toString(),
        error:
          "Wallet is not a Coherent Guardian.",
      });
    }

    await assignGuardianRole(
      discordUserId
    );

    return res.status(200).json({
      verified: true,
      walletVerified: true,
      coherent: true,
      cubeCount: "1",
      wallet:
        normalizedWallet,
      discordVerified: true,
      roleAssigned: true,
      message:
        "Coherent Guardian verified and Discord Guardian role assigned.",
    });
  } catch (error) {
    console.error(
      "Guardian verification error:",
      error
    );

    return res.status(500).json({
      verified: false,
      error:
        "Guardian verification failed.",
    });
  }
}
