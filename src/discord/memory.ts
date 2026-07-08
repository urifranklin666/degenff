import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { BrainTurn } from "./brain";

/**
 * The Barker's rolling channel memory. Persists per channel in Postgres so
 * the bot survives restarts with context intact. A second, cheap Haiku call
 * compacts the channel's recent activity into a ~200-token paragraph after
 * every ~25 new messages following a reply. The Barker's main think() call
 * reads the current gist as a non-cached system block.
 *
 * Lookups are wrapped in an in-process cache to keep the hot path cheap.
 */

const { barkerMemory } = schema;

const MODEL = process.env.DISCORD_BARKER_MEMORY_MODEL || "claude-haiku-4-5";
const GIST_MAX_TOKENS = 280;
const REFRESH_INTERVAL_MSGS = 25;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const gistCache = new Map<string, string>();
const msgCounter = new Map<string, number>();
const refreshing = new Set<string>();

export async function getGist(channelId: string): Promise<string> {
  const cached = gistCache.get(channelId);
  if (cached !== undefined) return cached;
  const row = await db.query.barkerMemory.findFirst({
    where: eq(barkerMemory.channelId, channelId),
  });
  const gist = row?.gist ?? "";
  gistCache.set(channelId, gist);
  return gist;
}

/** Bump the per-channel message counter. Call once per non-bot message seen. */
export function noteChannelMessage(channelId: string): number {
  const next = (msgCounter.get(channelId) ?? 0) + 1;
  msgCounter.set(channelId, next);
  return next;
}

export function shouldRefreshGist(channelId: string): boolean {
  return (msgCounter.get(channelId) ?? 0) >= REFRESH_INTERVAL_MSGS;
}

/** Re-summarize the channel. Idempotent under concurrent calls — only one
 * refresh per channel runs at a time. Fire-and-forget from converse.ts. */
export async function refreshGist(channelId: string, turns: BrainTurn[]): Promise<void> {
  if (refreshing.has(channelId)) return;
  refreshing.add(channelId);
  try {
    const prevGist = await getGist(channelId);
    const summary = await summarize(turns, prevGist);
    if (!summary) return;

    await db.insert(barkerMemory)
      .values({ channelId, gist: summary, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: barkerMemory.channelId,
        set: { gist: summary, updatedAt: new Date() },
      });
    gistCache.set(channelId, summary);
    msgCounter.set(channelId, 0);
  } catch (err) {
    console.error("[barker memory] refresh failed:", err);
  } finally {
    refreshing.delete(channelId);
  }
}

const SUMMARIZER_SYSTEM = `You compact a Discord channel's recent activity into a short, dense paragraph for an AI chat persona called The Barker who hangs out in the same channel.

You will receive:
1. The PREVIOUS gist (may be empty).
2. The most recent channel messages, oldest first.

Output a single paragraph, under 200 words, written in the third person and present tense, that captures:
- who's currently around (display names)
- what bits / topics / in-jokes are running
- anything promised or expected (drops, deadlines, ongoing arguments)
- mood / energy of the room

Merge new information into the previous gist; drop stale items. Do NOT mention yourself or The Barker. Do NOT include greetings, headers, bullet points, or meta-commentary. Just the paragraph.`;

async function summarize(turns: BrainTurn[], prevGist: string): Promise<string | null> {
  if (turns.length === 0) return null;
  const recent = turns
    .map((t) => (t.role === "assistant" ? `Barker: ${t.content}` : t.content))
    .join("\n");
  const userBlock = `PREVIOUS GIST:\n${prevGist || "(none yet)"}\n\nRECENT MESSAGES:\n${recent}`;

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: GIST_MAX_TOKENS,
    system: [{ type: "text", text: SUMMARIZER_SYSTEM }],
    messages: [{ role: "user", content: userBlock }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  return text.length > 0 ? text : null;
}
