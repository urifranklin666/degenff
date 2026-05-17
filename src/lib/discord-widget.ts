/**
 * Fetch the public guild widget JSON. Requires "Enable Server Widget" in
 * Server Settings → Widget; returns 403/404 / null otherwise.
 *
 * The widget endpoint is rate-limited; we cache for 60s via Next.js fetch
 * cache so a busy /discord page doesn't hammer Discord.
 */
export type WidgetChannel = { id: string; name: string; position: number };
export type WidgetMember = {
  id: string;
  username: string;
  status: "online" | "idle" | "dnd" | "offline";
  avatar_url?: string | null;
};
export type DiscordWidget = {
  id: string;
  name: string;
  instant_invite: string | null;
  channels: WidgetChannel[];
  members: WidgetMember[];
  presence_count: number;
};

export async function fetchWidget(): Promise<DiscordWidget | null> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return null;

  try {
    const r = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/widget.json`,
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) },
    );
    if (!r.ok) {
      // 403 = widget disabled. 429 = rate-limited. Either way, render fallback.
      return null;
    }
    return (await r.json()) as DiscordWidget;
  } catch {
    return null;
  }
}
