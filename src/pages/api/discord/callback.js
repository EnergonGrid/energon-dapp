import crypto from "crypto";

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");

        return [
          decodeURIComponent(part.slice(0, index)),
          decodeURIComponent(part.slice(index + 1)),
        ];
      })
  );
}

function signDiscordSession(discordUserId, secret) {
  const signature = crypto
    .createHmac("sha256", secret)
    .update(discordUserId)
    .digest("hex");

  return `${discordUserId}.${signature}`;
}

export default async function handler(req, res) {
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
      error: `Discord OAuth error: ${error}`,
    });
  }

  if (!code || !state) {
    return res.status(400).json({
      error: "Missing Discord OAuth code or state.",
    });
  }

  const cookies =
    parseCookies(req.headers.cookie || "");

  const expectedState =
    cookies.discord_oauth_state;

  if (
    !expectedState ||
    state !== expectedState
  ) {
    return res.status(403).json({
      error: "Invalid Discord OAuth state.",
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

  try {
    const tokenResponse = await fetch(
      "https://discord.com/api/v10/oauth2/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type:
            "authorization_code",
          code: String(code),
          redirect_uri: redirectUri,
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

    const userResponse = await fetch(
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

    const signedSession =
      signDiscordSession(
        discordUser.id,
        sessionSecret
      );

    const secure =
      process.env.NODE_ENV === "production"
        ? "; Secure"
        : "";

    res.setHeader("Set-Cookie", [
      `discord_session=${encodeURIComponent(
        signedSession
      )}; HttpOnly; SameSite=Lax; Path=/; Max-Age=900${secure}`,

      `discord_oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`,
    ]);

    return res.redirect(
      "/mint?discord=connected"
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
