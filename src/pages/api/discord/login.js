import crypto from "crypto";

function createSignedState(secret) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(24).toString("hex");

  const payload =
    `${timestamp}.${nonce}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed.",
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
        "Discord OAuth environment variables are missing.",
    });
  }

  const state =
    createSignedState(sessionSecret);

  const params =
    new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "identify",
      state,
    });

  return res.redirect(
    `https://discord.com/oauth2/authorize?${params.toString()}`
  );
}
