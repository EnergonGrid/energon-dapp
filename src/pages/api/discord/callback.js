import crypto from "crypto";

const DISCORD_PROOF_MAX_AGE_MS =
  10 * 60 * 1000;

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

function verifySignedState(state, secret) {
  if (
    !state ||
    typeof state !== "string" ||
    !secret
  ) {
    return false;
  }

  const parts = state.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [
    timestamp,
    nonce,
    suppliedSignature,
  ] = parts;

  if (
    !/^[0-9]+$/.test(timestamp) ||
    !/^[a-f0-9]+$/i.test(nonce) ||
    !/^[a-f0-9]+$/i.test(
      suppliedSignature
    )
  ) {
    return false;
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
    return false;
  }

  const payload =
    `${timestamp}.${nonce}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(payload)
      .digest("hex");

  return safeEqualHex(
    suppliedSignature,
    expectedSignature
  );
}

function createDiscordProof(
  discordUserId,
  secret
) {
  const timestamp =
    Date.now().toString();

  const nonce =
    crypto
      .randomBytes(24)
      .toString("hex");

  const payload =
    `${discordUserId}.${timestamp}.${nonce}`;

  const signature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(payload)
      .digest("hex");

  return `${payload}.${signature}`;
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

  if (
    !verifySignedState(
      String(state),
      sessionSecret
    )
  ) {
    return res.status(403).json({
      error:
        "Invalid or expired Discord OAuth state.",
    });
  }

  try {
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
              client_id: clientId,
              client_secret:
                clientSecret,
              grant_type:
                "authorization_code",
              code: String(code),
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

    const discordProof =
      createDiscordProof(
        String(discordUser.id),
        sessionSecret
      );

    const params =
      new URLSearchParams({
        discord: "connected",
        proof: discordProof,
      });

    return res.redirect(
      `https://guardian.energon.app/leave-record.html?${params.toString()}`
    );
  } catch (error) {
    console.error(
      "Discord OAuth callback error:",
      error
    );

    return res.status(500).json({
      error:
        "Discord OAuth callback failed.",
    });
  }
}
