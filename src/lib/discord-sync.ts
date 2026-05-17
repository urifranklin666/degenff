import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { users } = schema;

type GuildMember = { roles: string[]; nick?: string | null };

/**
 * Pull the user's guild-member object from Discord using their oauth access
 * token, map their Discord role IDs to our app role, and update users.role +
 * users.discordRoles + users.lastSeenAt. Best-effort; failures are swallowed
 * by the caller so a Discord outage doesn't lock people out of the site.
 */
export async function syncDiscordMember(userId: string, accessToken: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return;

  const r = await fetch(
    `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (r.status === 404) {
    // user is not in the guild — they can still sign in but stay 'contributor'
    await db.update(users)
      .set({ discordRoles: [], role: "contributor", lastSeenAt: new Date() })
      .where(eq(users.id, userId));
    return;
  }
  if (!r.ok) throw new Error(`discord member fetch ${r.status}`);

  const member = (await r.json()) as GuildMember;
  const memberRoles = Array.isArray(member.roles) ? member.roles : [];

  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
  const modRoleId = process.env.DISCORD_MOD_ROLE_ID;

  let role: "admin" | "mod" | "contributor" = "contributor";
  if (adminRoleId && memberRoles.includes(adminRoleId)) role = "admin";
  else if (modRoleId && memberRoles.includes(modRoleId)) role = "mod";

  await db.update(users)
    .set({
      role,
      discordRoles: memberRoles,
      lastSeenAt: new Date(),
    })
    .where(eq(users.id, userId));
}
