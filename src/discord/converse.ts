import { type Client, type GuildTextBasedChannel, type Message } from "discord.js";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { brainEnabled, brainModel, PASS_TOKEN, think, type BrainTurn } from "./brain";
import { noteChannelMessage, refreshGist, shouldRefreshGist } from "./memory";
import type { ActorCtx } from "./tools";

const { users } = schema;

/**
 * The Barker — wiring. Responds to @-mentions, replies, and keyword triggers;
 * lurks in ambient channels with a chatty baseline that ratchets up further
 * when humans are actively talking to it ("engaged mode"); occasionally
 * reacts to messages with an emoji instead of replying; and on a timer
 * decides whether to chime in unprompted when the room's been quiet.
 *
 * All state is in-memory and resets on bot restart (same as quotes.ts).
 */

// ── shared
const CONTEXT_LIMIT = 14; // recent channel messages handed to the model
const MSG_CLAMP = 1500; // per-message char cap fed into context
const MAX_REPLY = 1900; // Discord hard limit is 2000
const GLOBAL_MAX_PER_MIN = 25; // hard ceiling across all channels

// ── mention / reply
const MENTION_COOLDOWN_MS = 2_000; // debounce rapid mentions in one channel

// ── ambient (unprompted, in configured channels)
const AMBIENT_COOLDOWN_MS = 90_000; // min quiet time before an unprompted chime-in
const AMBIENT_CHANCE = 0.7; // probability of chiming in once the cooldown clears

// ── engaged mode: triggered by mention/keyword, decays after a window
const ENGAGED_MS = 10 * 60_000;
const ENGAGED_AMBIENT_COOLDOWN_MS = 30_000;
const ENGAGED_AMBIENT_CHANCE = 0.9;

// ── keyword triggers (ambient channels only; treated as a soft mention)
const KEYWORD_RE = /\b(barker|degenff|degeneratefuckface)\b/i;
const KEYWORD_COOLDOWN_MS = 60_000;

// ── emoji reactions: cheap presence between text replies
const REACTION_CHANCE = 0.05;
const REACTION_POOL = ["🩸", "🦷", "💀", "⚙️", "👁️", "⛓️", "🎰", "🎪"];

// ── self-tick: scheduled "got anything?" sweep across ambient channels
const TICK_INTERVAL_MS = 45 * 60_000;
const TICK_MIN_BOT_QUIET_MS = 15 * 60_000; // bot must have been silent this long
const TICK_MAX_ROOM_QUIET_MS = 60 * 60_000; // skip dead rooms
const TICK_CHANCE = 0.5;

const lastReplyAt = new Map<string, number>(); // channelId → last reply timestamp
const engagedUntil = new Map<string, number>(); // channelId → engaged-mode expiry
const recentReplies: number[] = []; // timestamps, for the global rate cap

function ambientChannelIds(): string[] {
  return (process.env.DISCORD_BARKER_AMBIENT_CHANNEL_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function globalRateOk(now: number): boolean {
  while (recentReplies.length > 0 && now - recentReplies[0] > 60_000) recentReplies.shift();
  return recentReplies.length < GLOBAL_MAX_PER_MIN;
}

function isEngaged(channelId: string, now: number): boolean {
  return (engagedUntil.get(channelId) ?? 0) > now;
}

function pickReaction(): string {
  return REACTION_POOL[Math.floor(Math.random() * REACTION_POOL.length)];
}

async function resolveActor(client: Client, discordUserId: string): Promise<ActorCtx> {
  const u = await db.query.users.findFirst({ where: eq(users.discordId, discordUserId) });
  return {
    client,
    discordId: discordUserId,
    modUserId: u?.id ?? null,
    role: u?.role ?? null,
  };
}

export async function onBarkerMessage(message: Message) {
  if (!brainEnabled()) return;
  if (message.author.bot) return; // ignores itself and every other bot
  if (!message.inGuild()) return; // guild channels only
  if (!message.channel.isTextBased()) return;

  const me = message.client.user;
  if (!me) return;
  const content = message.content?.trim();
  if (!content) return;

  const channelId = message.channelId;
  noteChannelMessage(channelId); // feeds the gist-refresh counter
  const now = Date.now();
  const last = lastReplyAt.get(channelId) ?? 0;
  const mentioned = message.mentions.users.has(me.id);
  const inAmbient = ambientChannelIds().includes(channelId);
  const keywordHit = !mentioned && inAmbient && KEYWORD_RE.test(content);

  let mode: "mention" | "keyword" | "ambient" | null = null;
  if (mentioned) {
    if (now - last < MENTION_COOLDOWN_MS) return;
    mode = "mention";
  } else if (keywordHit) {
    if (now - last < KEYWORD_COOLDOWN_MS) return;
    mode = "keyword";
  } else if (inAmbient) {
    const engaged = isEngaged(channelId, now);
    const cooldown = engaged ? ENGAGED_AMBIENT_COOLDOWN_MS : AMBIENT_COOLDOWN_MS;
    const chance = engaged ? ENGAGED_AMBIENT_CHANCE : AMBIENT_CHANCE;
    if (now - last > cooldown && Math.random() < chance) mode = "ambient";
  }

  // Emoji-react path: only fires when we're NOT going to text-reply, only in
  // ambient channels. Cheap presence between replies — no API cost.
  if (!mode) {
    if (inAmbient && Math.random() < REACTION_CHANCE) {
      await message.react(pickReaction()).catch(() => {});
    }
    return;
  }

  if (!globalRateOk(now)) return;

  // Claim the slot before the await so concurrent messages can't double-fire.
  lastReplyAt.set(channelId, now);
  recentReplies.push(now);

  // Human-addressed turns extend engaged mode; ambient self-replies don't,
  // otherwise the bot keeps itself hot indefinitely.
  if (mode === "mention" || mode === "keyword") {
    engagedUntil.set(channelId, now + ENGAGED_MS);
  }

  try {
    const channel = message.channel;
    const [turns, actor] = await Promise.all([
      gatherContext(channel, me.id),
      resolveActor(message.client, message.author.id),
    ]);
    if (turns.length === 0) return;

    await channel.sendTyping().catch(() => {});
    const reply = await think(turns, { channelId, actor });
    if (!reply) return;

    const text = reply.length > MAX_REPLY ? `${reply.slice(0, MAX_REPLY)} …` : reply;
    if (mode === "mention") {
      await message.reply({ content: text, allowedMentions: { parse: [], repliedUser: true } });
    } else {
      await channel.send({ content: text, allowedMentions: { parse: [] } });
    }

    if (shouldRefreshGist(channelId)) {
      void refreshGist(channelId, turns);
    }
  } catch (err) {
    console.error("[barker] reply failed:", err);
  }
}

/** Pull the last N channel messages into chronological model turns. */
async function gatherContext(channel: GuildTextBasedChannel, meId: string): Promise<BrainTurn[]> {
  const fetched = await channel.messages.fetch({ limit: CONTEXT_LIMIT });
  const ordered = [...fetched.values()].reverse(); // fetch is newest-first
  const turns: BrainTurn[] = [];
  for (const m of ordered) {
    const text = m.content?.trim();
    if (!text) continue;
    if (m.author.id === meId) {
      turns.push({ role: "assistant", content: text.slice(0, MSG_CLAMP) });
    } else if (!m.author.bot) {
      const name = m.member?.displayName || m.author.username;
      turns.push({ role: "user", content: `${name}: ${text.slice(0, MSG_CLAMP)}` });
    }
  }
  return turns;
}

/** Self-tick: per ambient channel, on a slow interval, ask the model whether
 * it has anything to say. The model can reply with PASS_TOKEN to stay quiet. */
async function runSelfTick(client: Client) {
  const me = client.user;
  if (!me) return;
  for (const channelId of ambientChannelIds()) {
    try {
      if (Math.random() > TICK_CHANCE) continue;
      const now = Date.now();
      if (now - (lastReplyAt.get(channelId) ?? 0) < TICK_MIN_BOT_QUIET_MS) continue;
      if (!globalRateOk(now)) continue;

      const fetched = await client.channels.fetch(channelId).catch(() => null);
      if (!fetched || !fetched.isTextBased() || fetched.isDMBased()) continue;
      const channel = fetched as GuildTextBasedChannel;

      const head = await channel.messages.fetch({ limit: 1 });
      const newest = head.first();
      if (!newest) continue;
      if (now - newest.createdTimestamp > TICK_MAX_ROOM_QUIET_MS) continue; // dead room
      if (newest.author.id === me.id) continue; // last word was already ours

      const turns = await gatherContext(channel, me.id);
      if (turns.length === 0) continue;

      lastReplyAt.set(channelId, now);
      recentReplies.push(now);

      await channel.sendTyping().catch(() => {});
      const reply = await think(turns, { channelId, selfInitiated: true });
      if (!reply) continue;
      if (reply === PASS_TOKEN || reply.startsWith(PASS_TOKEN)) continue;

      const text = reply.length > MAX_REPLY ? `${reply.slice(0, MAX_REPLY)} …` : reply;
      await channel.send({ content: text, allowedMentions: { parse: [] } });

      if (shouldRefreshGist(channelId)) {
        void refreshGist(channelId, turns);
      }
    } catch (err) {
      console.error("[barker] self-tick failed:", err);
    }
  }
}

export function registerConverse(client: Client) {
  if (!brainEnabled()) {
    console.log("[barker] ANTHROPIC_API_KEY not set — conversational layer disabled");
    return;
  }
  client.on("messageCreate", (m) => void onBarkerMessage(m));
  const ambient = ambientChannelIds();
  if (ambient.length > 0) {
    setInterval(() => void runSelfTick(client), TICK_INTERVAL_MS).unref();
  }
  console.log(
    `[barker] online · model=${brainModel()} · ambient channels: ${ambient.length || "none"}`,
  );
}
