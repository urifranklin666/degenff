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
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction],
  });

  registerHandlers(client);

  // Clean shutdown. The scheduler's setInterval/setTimeout keep the event
  // loop alive indefinitely, so client.destroy() alone won't end the
  // process — we must explicitly exit. The unref'd timer is a hard ceiling
  // in case client.destroy() itself hangs.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[bot] ${signal} received — shutting down`);
    setTimeout(() => process.exit(0), 5000).unref();
    try {
      await client.destroy();
    } catch (err) {
      console.error("[bot] destroy failed:", err);
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await client.login(token);
}

main().catch((err) => {
  console.error("[bot] fatal:", err);
  process.exit(1);
});
