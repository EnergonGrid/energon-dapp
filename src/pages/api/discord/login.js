import crypto from "crypto";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: "Discord OAuth environment variables are missing.",
    });
  }

  const state = crypto.randomBytes(32).toString("hex");

  res.setHeader(
    "Set-Cookie",
    `discord_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );

  const params = new URLSearchParams({
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
