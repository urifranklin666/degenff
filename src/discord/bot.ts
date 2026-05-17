import { Client, GatewayIntentBits, Partials } from "discord.js";
import { registerHandlers } from "./handlers";

/**
 * degenff Discord bot — runs as a separate Node process (systemd unit
 * degenff-bot.service). Handles mod-queue button interactions and pushes
 * Discord role changes into our users table.
 */
async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("DISCORD_BOT_TOKEN is not set. Source /etc/degenff/env first.");
    process.exit(1);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildPresences,
    ],
    partials: [Partials.Channel, Partials.GuildMember],
  });

  registerHandlers(client);

  process.on("SIGINT", () => client.destroy());
  process.on("SIGTERM", () => client.destroy());

  await client.login(token);
}

main().catch((err) => {
  console.error("[bot] fatal:", err);
  process.exit(1);
});
