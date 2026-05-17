import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { users } = schema;

type DiscordMe = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};
type GuildMember = { roles: string[]; nick?: string | null };

/**
 * Single source of truth for "what does this user look like on Discord."
 * Called from auth.ts on every sign-in. Best-effort — failures are logged
 * by the caller but never block sign-in.
 *
 * 1. /users/@me → canonical Discord username + snowflake
 * 2. /users/@me/guilds/{GUILD_ID}/member → guild roles (404 = not in guild)
 * 3. Update users row: discordId, handle, name, image, role, discordRoles,
 *    lastSeenAt
 */
export async function syncDiscordMember(userId: string, accessToken: string) {
  const guildId = process.env.DISCORD_GUILD_ID;

  const meRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!meRes.ok) throw new Error(`discord @me ${meRes.status}`);
  const me = (await meRes.json()) as DiscordMe;

  let memberRoles: string[] = [];
  if (guildId) {
    const r = await fetch(
      `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (r.ok) {
      const member = (await r.json()) as GuildMember;
      memberRoles = Array.isArray(member.roles) ? member.roles : [];
    }
    // r.status === 404 just means not in the guild — leave roles empty
  }

  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
  const modRoleId = process.env.DISCORD_MOD_ROLE_ID;
  let role: "admin" | "mod" | "contributor" = "contributor";
  if (adminRoleId && memberRoles.includes(adminRoleId)) role = "admin";
  else if (modRoleId && memberRoles.includes(modRoleId)) role = "mod";

  const avatar = me.avatar
    ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.${me.avatar.startsWith("a_") ? "gif" : "png"}`
    : null;

  await db.update(users)
    .set({
      discordId: me.id,
      handle: me.username,
      name: me.global_name ?? me.username,
      image: avatar,
      role,
      discordRoles: memberRoles,
      lastSeenAt: new Date(),
    })
    .where(eq(users.id, userId));
}
