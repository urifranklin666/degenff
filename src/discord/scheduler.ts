import { type Client, EmbedBuilder, type TextChannel, ChannelType } from "discord.js";
import { eq, and, gte, count } from "drizzle-orm";
import { db, schema } from "@/db";
import { GOOSE_LINES } from "./slashCommands";

const { submissions, feats } = schema;

/**
 * Scheduler. Two cadences:
 *   • Weekly digest — Saturday 4am UTC, posts a week-in-review embed to
 *     DISCORD_DIGEST_CHANNEL_ID. Skipped silently if env var unset.
 *   • Random oracle drops — every 3–6 hours (randomized), posts a
 *     manifesto-voice line to DISCORD_DROP_CHANNEL_ID.
 *
 * Both run in-process inside the bot; no external cron needed.
 */

let lastDigestKey = "";

function isoWeekKey(d: Date): string {
  // ISO week number — Monday-based week, week 1 contains the first Thursday.
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

async function maybePostDigest(client: Client) {
  const channelId = process.env.DISCORD_DIGEST_CHANNEL_ID;
  if (!channelId) return;

  const now = new Date();
  if (now.getUTCDay() !== 6) return;       // Saturday
  if (now.getUTCHours() !== 4) return;      // 04:xx UTC

  const key = isoWeekKey(now);
  if (lastDigestKey === key) return;
  lastDigestKey = key;

  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  const [{ c: newSubs }] = await db.select({ c: count() })
    .from(submissions)
    .where(and(eq(submissions.status, "approved"), gte(submissions.decidedAt, weekAgo)));
  const [{ c: newFeats }] = await db.select({ c: count() })
    .from(feats)
    .where(and(eq(feats.status, "approved"), gte(feats.publishedAt, weekAgo)));
  const [{ c: newFeatured }] = await db.select({ c: count() })
    .from(submissions)
    .where(and(eq(submissions.featured, true), gte(submissions.decidedAt, weekAgo)));

  const ch = await client.channels.fetch(channelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) return;

  const dateRange = `${weekAgo.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}`;
  const lines = [
    `WEEK OF              ${dateRange}`,
    `─────────────────────────────`,
    `NEW SUBMISSIONS      ${newSubs}`,
    `NEW FEATURED         ${newFeatured}`,
    `NEW FEATS            ${newFeats}`,
  ];

  const embed = new EmbedBuilder()
    .setColor(0xcc0000)
    .setTitle("◆ this week on the record")
    .setDescription("```\n" + lines.join("\n") + "\n```")
    .setFooter({ text: "// late edition · published nightly · saturday 4am drop" })
    .setTimestamp();

  await (ch as TextChannel).send({ embeds: [embed] })
    .catch((err) => console.error("[digest] failed:", err));
}

async function postDrop(client: Client) {
  const channelId = process.env.DISCORD_DROP_CHANNEL_ID;
  if (!channelId) return;
  const ch = await client.channels.fetch(channelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) return;

  const line = GOOSE_LINES[Math.floor(Math.random() * GOOSE_LINES.length)];

  const embed = new EmbedBuilder()
    .setColor(0x4a0000)
    .setDescription(`▮  *${line}*`)
    .setFooter({ text: "— evidence drop · the goose, intermittent" });

  await (ch as TextChannel).send({ embeds: [embed] })
    .catch((err) => console.error("[drop] failed:", err));
}

function scheduleNextDrop(client: Client) {
  // random 3–6 hour delay so it doesn't feel mechanical
  const min = 3 * 60 * 60 * 1000;
  const max = 6 * 60 * 60 * 1000;
  const delay = min + Math.random() * (max - min);
  setTimeout(async () => {
    try { await postDrop(client); } catch (err) { console.error("[drop] tick failed:", err); }
    scheduleNextDrop(client);
  }, delay);
}

export function startScheduler(client: Client) {
  // Digest: check every minute (cheap; only acts on the right minute)
  setInterval(() => {
    maybePostDigest(client).catch((err) => console.error("[digest] tick failed:", err));
  }, 60_000);

  // Drops: random 3–6h cadence, first one in 30–90 min
  const firstDelay = (30 + Math.random() * 60) * 60 * 1000;
  setTimeout(() => {
    postDrop(client).catch((err) => console.error("[drop] first tick failed:", err));
    scheduleNextDrop(client);
  }, firstDelay);

  console.log("[bot] scheduler started · digest=saturday 4am UTC · drops=every 3–6h");
}
