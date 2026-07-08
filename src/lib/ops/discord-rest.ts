const API = "https://discord.com/api/v10";

function authHeader(): Record<string, string> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN not set");
  return { Authorization: `Bot ${token}`, "Content-Type": "application/json" };
}

function guildId(): string {
  const id = process.env.DISCORD_GUILD_ID;
  if (!id) throw new Error("DISCORD_GUILD_ID not set");
  return id;
}

async function rest<T>(path: string, init?: RequestInit & { method?: string }): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { ...authHeader(), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`discord ${init?.method ?? "GET"} ${path} → ${res.status} ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ── identity ────────────────────────────────────────────────────────── */

export type BotIdentity = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export async function getBotIdentity(): Promise<BotIdentity> {
  return rest<BotIdentity>("/users/@me");
}

/* ── members ─────────────────────────────────────────────────────────── */

export type GuildMember = {
  user: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
    bot?: boolean;
  };
  nick: string | null;
  roles: string[];
  joined_at: string;
};

/** List members, paginated. Discord caps `limit` at 1000.
 *  `after` is the highest user.id you've seen so far. */
export async function listGuildMembers(opts: { limit?: number; after?: string } = {}): Promise<GuildMember[]> {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(1000, Math.max(1, opts.limit ?? 1000))));
  if (opts.after) params.set("after", opts.after);
  return rest<GuildMember[]>(`/guilds/${guildId()}/members?${params.toString()}`);
}

/** Search guild members by query string (Discord-side substring match). */
export async function searchGuildMembers(query: string, limit = 25): Promise<GuildMember[]> {
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("limit", String(Math.min(1000, Math.max(1, limit))));
  return rest<GuildMember[]>(`/guilds/${guildId()}/members/search?${params.toString()}`);
}

export async function getGuildMember(userId: string): Promise<GuildMember> {
  return rest<GuildMember>(`/guilds/${guildId()}/members/${userId}`);
}

export async function setMemberRoles(userId: string, roles: string[], reason?: string): Promise<void> {
  await rest<void>(`/guilds/${guildId()}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ roles }),
    headers: reason ? { "X-Audit-Log-Reason": reason } : undefined,
  });
}

/* ── channels ────────────────────────────────────────────────────────── */

export type GuildChannel = {
  id: string;
  name: string;
  type: number; // 0=text, 5=announcement, 15=forum, ...
  position: number;
  parent_id: string | null;
};

export async function listGuildChannels(): Promise<GuildChannel[]> {
  return rest<GuildChannel[]>(`/guilds/${guildId()}/channels`);
}

export async function sendChannelMessage(channelId: string, content: string): Promise<{ id: string }> {
  return rest<{ id: string }>(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

/** Send a raw Discord message payload (embeds + components). Use when a
 *  bare content string isn't enough — showcase mirrors, audit lines, etc. */
export type MessagePayload = {
  content?: string;
  embeds?: unknown[];
  components?: unknown[];
};

export async function sendChannelPayload(channelId: string, payload: MessagePayload): Promise<{ id: string }> {
  return rest<{ id: string }>(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Edit an existing message. Pass empty embeds/components to clear them. */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  payload: MessagePayload,
): Promise<void> {
  await rest<void>(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
  await rest<void>(`/channels/${channelId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

/** Start a thread on an existing message. 7-day auto-archive matches what
 *  the bot does. Optional — failures are non-fatal. */
export async function startMessageThread(
  channelId: string,
  messageId: string,
  name: string,
): Promise<void> {
  await rest<void>(`/channels/${channelId}/messages/${messageId}/threads`, {
    method: "POST",
    body: JSON.stringify({
      name: name.slice(0, 100),
      auto_archive_duration: 10080,
    }),
  });
}
