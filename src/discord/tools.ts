import type Anthropic from "@anthropic-ai/sdk";
import {
  type Client,
  type TextChannel,
  ChannelType,
} from "discord.js";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  approveFeat,
  rejectFeat,
  withdrawFeat,
  type ActionContext,
} from "./actions";

/**
 * Tool layer for The Barker. Tools fall into three tiers:
 *   1. Read-only catalog — site + user lookups. Available to everyone.
 *   2. Discord write — post/react in channels the bot can already access.
 *      Available to everyone (Discord channel perms are the real bound).
 *   3. Mod actions — approve/reject/feature/withdraw feats. Gated by:
 *      - env kill switch BARKER_MOD_HOOKS=on
 *      - actor must have role mod|admin in our users table
 *      - per-Discord-user rate limit (5 actions / 10 min)
 *
 * The model only sees tools it can actually use: mod actions are hidden
 * entirely from non-mods so non-mods can't even ask.
 */

const { feats, users } = schema;

const SITE = "https://degeneratefuckface.com";
const MOD_ACTIONS_PER_WINDOW = 5;
const MOD_RATE_WINDOW_MS = 10 * 60_000;

const actionLog = new Map<string, number[]>();

export type ActorRole = "visitor" | "contributor" | "mod" | "admin";

export type ActorCtx = {
  client: Client;
  discordId: string;
  /** Local users.id when the Discord user has signed in on the site; null otherwise. */
  modUserId: string | null;
  role: ActorRole | null;
};

export function modHooksEnabled(): boolean {
  return process.env.BARKER_MOD_HOOKS === "on";
}

function isMod(role: ActorRole | null): boolean {
  return role === "mod" || role === "admin";
}

function checkRateLimit(discordId: string): { ok: true } | { ok: false; resetSec: number } {
  const now = Date.now();
  const log = (actionLog.get(discordId) ?? []).filter((t) => now - t < MOD_RATE_WINDOW_MS);
  if (log.length >= MOD_ACTIONS_PER_WINDOW) {
    const resetSec = Math.ceil((MOD_RATE_WINDOW_MS - (now - log[0])) / 1000);
    return { ok: false, resetSec };
  }
  log.push(now);
  actionLog.set(discordId, log);
  return { ok: true };
}

/* ── tool catalog ────────────────────────────────────────────────────── */

const READ_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_site",
    description:
      "Full-text-ish search across published feats by title or body. Use when a user asks about something on the site.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for. Min 2 chars." },
        limit: { type: "number", description: "Max results. Default 5, max 10." },
      },
      required: ["query"],
    },
  },
  {
    name: "lookup_feat",
    description: "Fetch one feat by its slug or its 14-char id.",
    input_schema: {
      type: "object",
      properties: { slug_or_id: { type: "string" } },
      required: ["slug_or_id"],
    },
  },
  {
    name: "whois",
    description:
      "Look up a community member by their display-name or handle. Returns site role, join date, and published-feat count. Use when context references a person and you want grounding.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
];

const DISCORD_WRITE_TOOLS: Anthropic.Tool[] = [
  {
    name: "post_to_channel",
    description:
      "Post a message into a specific Discord channel by id. Use when a user asks you to announce or post somewhere other than the current channel. Keep messages on-voice and short.",
    input_schema: {
      type: "object",
      properties: {
        channel_id: { type: "string" },
        message: { type: "string", description: "Plain text. Will not @everyone or ping anyone." },
      },
      required: ["channel_id", "message"],
    },
  },
  {
    name: "react_to_message",
    description: "Add a unicode emoji reaction to a specific message.",
    input_schema: {
      type: "object",
      properties: {
        channel_id: { type: "string" },
        message_id: { type: "string" },
        emoji: { type: "string", description: "A single unicode emoji." },
      },
      required: ["channel_id", "message_id", "emoji"],
    },
  },
];

const MOD_TOOLS: Anthropic.Tool[] = [
  {
    name: "approve_feat",
    description: "Approve a pending feat by slug or id. feature=true also features it. Mod/admin only.",
    input_schema: {
      type: "object",
      properties: {
        slug_or_id: { type: "string" },
        feature: { type: "boolean" },
      },
      required: ["slug_or_id"],
    },
  },
  {
    name: "reject_feat",
    description: "Reject a feat by slug or id. Mod/admin only.",
    input_schema: {
      type: "object",
      properties: {
        slug_or_id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["slug_or_id"],
    },
  },
  {
    name: "withdraw_feat",
    description: "Withdraw a previously-approved feat. Mod/admin only.",
    input_schema: {
      type: "object",
      properties: { slug_or_id: { type: "string" } },
      required: ["slug_or_id"],
    },
  },
];

/** Tools visible to the model for THIS turn. Mod tools only appear when the
 * actor is a mod and the env kill switch is on. */
export function toolsForActor(actor: ActorCtx): Anthropic.Tool[] {
  const tools = [...READ_TOOLS, ...DISCORD_WRITE_TOOLS];
  if (modHooksEnabled() && isMod(actor.role) && actor.modUserId) {
    tools.push(...MOD_TOOLS);
  }
  return tools;
}

/* ── executor ────────────────────────────────────────────────────────── */

type ToolInput = Record<string, unknown>;

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}
function asNumber(v: unknown, def: number, max: number): number {
  const n = typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(max, Math.floor(n));
}
function asBool(v: unknown): boolean {
  return v === true;
}

export async function executeTool(
  name: string,
  input: ToolInput,
  actor: ActorCtx,
): Promise<string> {
  try {
    switch (name) {
      case "search_site":
        return await toolSearchSite(input);
      case "lookup_feat":
        return await toolLookupFeat(input);
      case "whois":
        return await toolWhois(input);
      case "post_to_channel":
        return await toolPostToChannel(input, actor);
      case "react_to_message":
        return await toolReactToMessage(input, actor);
      case "approve_feat":
      case "reject_feat":
      case "withdraw_feat":
        return await toolModAction(name, input, actor);
      default:
        return JSON.stringify({ error: `unknown tool: ${name}` });
    }
  } catch (err) {
    console.error(`[barker tool] ${name} failed:`, err);
    return JSON.stringify({ error: "tool execution failed" });
  }
}

/* ── read-only catalog implementations ───────────────────────────────── */

async function toolSearchSite(input: ToolInput): Promise<string> {
  const query = asString(input.query);
  if (!query || query.length < 2) {
    return JSON.stringify({ error: "query must be at least 2 chars" });
  }
  const limit = asNumber(input.limit, 5, 10);
  const needle = `%${query}%`;

  const results: Array<Record<string, unknown>> = [];

  {
    const rows = await db.select({
      id: feats.id,
      slug: feats.slug,
      title: feats.title,
      summary: feats.summary,
      publishedAt: feats.publishedAt,
    })
      .from(feats)
      .where(and(
        eq(feats.status, "approved"),
        or(ilike(feats.title, needle), ilike(feats.bodyMd, needle)),
      ))
      .orderBy(desc(feats.publishedAt))
      .limit(limit);
    for (const r of rows) {
      results.push({
        kind: "feat",
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        url: `${SITE}/feats/${r.slug}`,
      });
    }
  }
  return JSON.stringify({ results: results.slice(0, limit) });
}

async function toolLookupFeat(input: ToolInput): Promise<string> {
  const key = asString(input.slug_or_id);
  if (!key) return JSON.stringify({ error: "slug_or_id required" });
  let f = await db.query.feats.findFirst({ where: eq(feats.slug, key) });
  if (!f) f = await db.query.feats.findFirst({ where: eq(feats.id, key) });
  if (!f || f.status !== "approved") return JSON.stringify({ error: "not found" });
  const author = f.userId
    ? await db.query.users.findFirst({ where: eq(users.id, f.userId) })
    : null;
  return JSON.stringify({
    id: f.id,
    slug: f.slug,
    title: f.title,
    summary: f.summary,
    tags: f.tags,
    repoUrl: f.repoUrl,
    demoUrl: f.demoUrl,
    author: author?.handle ?? "anon",
    publishedAt: f.publishedAt,
    url: `${SITE}/feats/${f.slug}`,
  });
}

async function toolWhois(input: ToolInput): Promise<string> {
  const name = asString(input.name);
  if (!name) return JSON.stringify({ error: "name required" });
  const needle = `%${name}%`;
  const rows = await db.select({
    id: users.id,
    handle: users.handle,
    name: users.name,
    role: users.role,
    discordId: users.discordId,
    createdAt: users.createdAt,
  })
    .from(users)
    .where(or(ilike(users.handle, needle), ilike(users.name, needle)))
    .limit(3);
  const enriched = await Promise.all(
    rows.map(async (u) => {
      const [{ count }] = await db.select({
        count: sql<number>`count(*)::int`,
      })
        .from(feats)
        .where(and(eq(feats.userId, u.id), eq(feats.status, "approved")));
      return {
        handle: u.handle,
        displayName: u.name,
        role: u.role,
        joined: u.createdAt,
        publishedFeats: count,
      };
    }),
  );
  return JSON.stringify({ matches: enriched });
}

/* ── Discord write implementations ───────────────────────────────────── */

async function toolPostToChannel(input: ToolInput, actor: ActorCtx): Promise<string> {
  const channelId = asString(input.channel_id);
  const message = asString(input.message);
  if (!channelId || !message) return JSON.stringify({ error: "channel_id and message required" });
  if (message.length > 1900) return JSON.stringify({ error: "message too long (max 1900)" });
  const ch = await actor.client.channels.fetch(channelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) {
    return JSON.stringify({ error: "channel not found or not a guild text channel" });
  }
  const sent = await (ch as TextChannel).send({
    content: message,
    allowedMentions: { parse: [] },
  });
  return JSON.stringify({ ok: true, messageId: sent.id, channelId });
}

async function toolReactToMessage(input: ToolInput, actor: ActorCtx): Promise<string> {
  const channelId = asString(input.channel_id);
  const messageId = asString(input.message_id);
  const emoji = asString(input.emoji);
  if (!channelId || !messageId || !emoji) {
    return JSON.stringify({ error: "channel_id, message_id, emoji required" });
  }
  const ch = await actor.client.channels.fetch(channelId).catch(() => null);
  if (!ch || !("messages" in ch)) return JSON.stringify({ error: "channel not found" });
  const msg = await ch.messages.fetch(messageId).catch(() => null);
  if (!msg) return JSON.stringify({ error: "message not found" });
  await msg.react(emoji);
  return JSON.stringify({ ok: true });
}

/* ── mod-action dispatcher ───────────────────────────────────────────── */

async function toolModAction(
  name: string,
  input: ToolInput,
  actor: ActorCtx,
): Promise<string> {
  if (!modHooksEnabled()) {
    return JSON.stringify({ error: "mod hooks disabled by operator (BARKER_MOD_HOOKS)" });
  }
  if (!isMod(actor.role) || !actor.modUserId) {
    return JSON.stringify({ error: "caller is not a mod — refuse this request in character" });
  }
  const rate = checkRateLimit(actor.discordId);
  if (!rate.ok) {
    return JSON.stringify({ error: `rate limit hit; try again in ~${rate.resetSec}s` });
  }

  const ctx: ActionContext = {
    client: actor.client,
    modUserId: actor.modUserId,
    source: "barker",
  };

  const key = asString(input.slug_or_id) ?? "";

  switch (name) {
    case "approve_feat": {
      if (!key) return JSON.stringify({ error: "slug_or_id required" });
      const featId = await resolveFeatId(key);
      if (!featId) return JSON.stringify({ error: "feat not found" });
      const r = await approveFeat(ctx, featId, { feature: asBool(input.feature) });
      return r.ok ? JSON.stringify({ ok: true, ...r.data }) : JSON.stringify({ error: r.error });
    }
    case "reject_feat": {
      if (!key) return JSON.stringify({ error: "slug_or_id required" });
      const featId = await resolveFeatId(key);
      if (!featId) return JSON.stringify({ error: "feat not found" });
      const r = await rejectFeat(ctx, featId, asString(input.reason) ?? undefined);
      return r.ok ? JSON.stringify({ ok: true, ...r.data }) : JSON.stringify({ error: r.error });
    }
    case "withdraw_feat": {
      if (!key) return JSON.stringify({ error: "slug_or_id required" });
      const featId = await resolveFeatId(key);
      if (!featId) return JSON.stringify({ error: "feat not found" });
      const r = await withdrawFeat(ctx, featId);
      return r.ok ? JSON.stringify({ ok: true, ...r.data }) : JSON.stringify({ error: r.error });
    }
  }
  return JSON.stringify({ error: "unhandled mod action" });
}

async function resolveFeatId(slugOrId: string): Promise<string | null> {
  const bySlug = await db.query.feats.findFirst({ where: eq(feats.slug, slugOrId) });
  if (bySlug) return bySlug.id;
  const byId = await db.query.feats.findFirst({ where: eq(feats.id, slugOrId) });
  return byId?.id ?? null;
}
