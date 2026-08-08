export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { discordUserId } = req.body || {};

  if (!discordUserId) {
    return res.status(400).json({
      error: "Missing discordUserId",
    });
  }

  const BOT_TOKEN =
    process.env.DISCORD_BOT_TOKEN;

  const GUILD_ID =
    process.env.DISCORD_GUILD_ID;

  const GUARDIAN_ROLE_ID =
    process.env.DISCORD_GUARDIAN_ROLE_ID;

  if (
    !BOT_TOKEN ||
    !GUILD_ID ||
    !GUARDIAN_ROLE_ID
  ) {
    return res.status(500).json({
      error:
        "Discord environment variables are not configured",
    });
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordUserId}/roles/${GUARDIAN_ROLE_ID}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 204) {
      return res.status(200).json({
        success: true,
        message: "Guardian role assigned",
      });
    }

    const errorText =
      await response.text();

    console.error(
      "Discord role assignment failed:",
      {
        status: response.status,
        body: errorText,
      }
    );

    return res
      .status(response.status)
      .json({
        error:
          "Discord role assignment failed",
        status: response.status,
      });
  } catch (error) {
    console.error(
      "Discord API error:",
      error
    );

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
