import { REST, Routes } from "discord.js";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { submissionQueueEmbed, modActionRow } from "./embeds";

const { submissions, users } = schema;

/**
 * Called from the web app (server action) immediately after a submission
 * is inserted. Uses the bot token via REST (no gateway connection — cheap
 * to call from a Next.js server action).
 */
export async function notifyNewSubmission(submissionId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_MOD_QUEUE_CHANNEL_ID;
  if (!token || !channelId) return;

  const s = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!s) return;
  const author = s.userId
    ? await db.query.users.findFirst({ where: eq(users.id, s.userId) })
    : null;

  const embed = submissionQueueEmbed(s, author?.handle ?? "anon").toJSON();
  const row = modActionRow(s.id).toJSON();

  const rest = new REST({ version: "10" }).setToken(token);
  const message = (await rest.post(Routes.channelMessages(channelId), {
    body: { embeds: [embed], components: [row] },
  })) as { id: string };

  await db.update(submissions)
    .set({ discordMessageId: message.id, discordChannelId: channelId })
    .where(eq(submissions.id, submissionId));
}
