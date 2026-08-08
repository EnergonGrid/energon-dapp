import crypto from "crypto";

const CUBE_ADDRESS =
  "0x30e1076bDf2B123B54486C2721125388af2d2061".toLowerCase();

const STATE_MAX_AGE_MS =
  10 * 60 * 1000;

function safeEqualBase64Url(a, b) {
  try {
    const aBuffer =
      Buffer.from(a, "base64url");

    const bBuffer =
      Buffer.from(b, "base64url");

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

function verifyGuardianState(
  state,
  secret
) {
  if (
    !state ||
    typeof state !== "string" ||
    !secret
  ) {
    return null;
  }

  const separator =
    state.lastIndexOf(".");

  if (separator <= 0) {
    return null;
  }

  const encoded =
    state.slice(0, separator);

  const suppliedSignature =
    state.slice(separator + 1);

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(encoded)
      .digest("base64url");

  if (
    !safeEqualBase64Url(
      suppliedSignature,
      expectedSignature
    )
  ) {
    return null;
  }

  try {
    const payload =
      JSON.parse(
        Buffer
          .from(
            encoded,
            "base64url"
          )
          .toString("utf8")
      );

    if (
      payload?.v !== 1 ||
      !payload?.wallet ||
      !/^0x[a-fA-F0-9]{40}$/.test(
        payload.wallet
      ) ||
      !payload?.cubeId ||
      !/^[0-9]+$/.test(
        String(payload.cubeId)
      ) ||
      !payload?.iat ||
      !Number.isFinite(
        Number(payload.iat)
      )
    ) {
      return null;
    }

    const createdAt =
      Number(payload.iat);

    if (
      Date.now() - createdAt >
        STATE_MAX_AGE_MS ||
      createdAt - Date.now() >
        60 * 1000
    ) {
      return null;
    }

    return {
      wallet:
        payload.wallet.toLowerCase(),

      cubeId:
        String(payload.cubeId),
    };
  } catch {
    return null;
  }
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

async function rpcCall(
  to,
  data
) {
  const rpcUrl =
    process.env.FLARE_RPC ||
    process.env.FLR_RPC;

  if (!rpcUrl) {
    throw new Error(
      "Missing FLARE_RPC environment variable."
    );
  }

  const response =
    await fetch(
      rpcUrl,
      {
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
      }
    );

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

async function cubeBalanceOf(
  wallet
) {
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

async function ownerOf(
  cubeId
) {
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
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  const {
    code,
    state,
    error,
  } = req.query || {};

  if (error) {
    return res.status(400).json({
      error:
        `Discord OAuth error: ${error}`,
    });
  }

  if (!code || !state) {
    return res.status(400).json({
      error:
        "Missing Discord OAuth code or state.",
    });
  }

  const clientId =
    process.env.DISCORD_CLIENT_ID;

  const clientSecret =
    process.env.DISCORD_CLIENT_SECRET;

  const redirectUri =
    process.env.DISCORD_REDIRECT_URI;

  const sessionSecret =
    process.env.DISCORD_SESSION_SECRET;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !sessionSecret
  ) {
    return res.status(500).json({
      error:
        "Discord OAuth environment variables are missing.",
    });
  }

  const guardianState =
    verifyGuardianState(
      String(state),
      sessionSecret
    );

  if (!guardianState) {
    return res.status(403).json({
      error:
        "Invalid or expired Guardian verification state.",
    });
  }

  try {
    /*
      Re-check Guardian coherence at callback time.

      This ensures the wallet still holds exactly one cube
      before the Discord role is assigned.
    */
    const balance =
      await cubeBalanceOf(
        guardianState.wallet
      );

    if (balance !== 1n) {
      return res.status(403).json({
        error:
          "Wallet is no longer a Coherent Guardian.",
      });
    }

    const cubeOwner =
      await ownerOf(
        guardianState.cubeId
      );

    if (
      cubeOwner !==
      guardianState.wallet
    ) {
      return res.status(403).json({
        error:
          "EnergonCube ownership changed before Discord verification completed.",
      });
    }

    const tokenResponse =
      await fetch(
        "https://discord.com/api/v10/oauth2/token",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body:
            new URLSearchParams({
              client_id:
                clientId,

              client_secret:
                clientSecret,

              grant_type:
                "authorization_code",

              code:
                String(code),

              redirect_uri:
                redirectUri,
            }),
        }
      );

    const tokenJson =
      await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenJson.access_token
    ) {
      console.error(
        "Discord token exchange failed:",
        tokenJson
      );

      return res.status(502).json({
        error:
          "Discord token exchange failed.",
      });
    }

    const userResponse =
      await fetch(
        "https://discord.com/api/v10/users/@me",
        {
          headers: {
            Authorization:
              `Bearer ${tokenJson.access_token}`,
          },
        }
      );

    const discordUser =
      await userResponse.json();

    if (
      !userResponse.ok ||
      !discordUser.id
    ) {
      console.error(
        "Discord user lookup failed:",
        discordUser
      );

      return res.status(502).json({
        error:
          "Discord user lookup failed.",
      });
    }

    await assignGuardianRole(
      String(discordUser.id)
    );

    const params =
      new URLSearchParams({
        discord: "verified",
        role: "assigned",
        cube:
          guardianState.cubeId,
      });

    return res.redirect(
      `https://guardian.energon.app/leave-record.html?${params.toString()}`
    );
  } catch (error) {
    console.error(
      "Discord Guardian callback error:",
      error
    );

    return res.status(500).json({
      error:
        "Discord Guardian verification failed.",
    });
  }
}
