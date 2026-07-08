import { desc } from "drizzle-orm";
import { db, schema } from "@/db";

const { discordActivity } = schema;

export type RecentTick = {
  user: string;        // @handle
  channel: string;     // #name
  text: string;
  at: string;
  hasAttachments: boolean;
};

/** Read the most recent N rows from the discord_activity cache. The bot
 *  is responsible for populating that table; if nothing is there yet,
 *  callers can fall back to placeholder copy. */
export async function recentDiscordTicks(limit = 24): Promise<RecentTick[]> {
  const rows = await db.query.discordActivity.findMany({
    orderBy: [desc(discordActivity.createdAt)],
    limit,
  });
  return rows.map((r) => ({
    user: r.authorName ? `@${r.authorName}` : "@anon",
    channel: r.channelName ? `#${r.channelName}` : "#unknown",
    text: r.contentExcerpt ?? "",
    at: r.createdAt.toISOString(),
    hasAttachments: r.hasAttachments,
  }));
}
