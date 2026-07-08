"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { assertAdminAction, assertModAction } from "@/lib/ops/auth";
import {
  searchGuildMembers,
  getGuildMember,
  setMemberRoles,
  sendChannelMessage,
  type GuildMember,
} from "@/lib/ops/discord-rest";

const { users } = schema;

export type MemberRow = {
  discordId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  isBot: boolean;
  roles: string[];
  siteRole: "visitor" | "contributor" | "mod" | "admin" | null;
  banned: boolean;
  handle: string | null;
};

async function annotate(members: GuildMember[]): Promise<MemberRow[]> {
  if (members.length === 0) return [];
  const ids = members.map((m) => m.user.id);
  const local = await db.query.users.findMany({
    where: (u, { inArray }) => inArray(u.discordId, ids),
  });
  const byDiscord = new Map(local.map((u) => [u.discordId!, u]));
  return members.map((m): MemberRow => {
    const u = byDiscord.get(m.user.id);
    return {
      discordId: m.user.id,
      username: m.user.username,
      displayName: m.nick || m.user.global_name || m.user.username,
      avatar: m.user.avatar
        ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.${m.user.avatar.startsWith("a_") ? "gif" : "png"}`
        : null,
      isBot: !!m.user.bot,
      roles: m.roles,
      siteRole: u?.role ?? null,
      banned: u?.banned ?? false,
      handle: u?.handle ?? null,
    };
  });
}

export async function searchMembersAction(query: string): Promise<MemberRow[]> {
  await assertModAction();
  const q = query.trim();
  if (!q) return [];
  const members = await searchGuildMembers(q, 25);
  return annotate(members);
}

export type SetRoleResult = { ok: boolean; message: string; newRole?: string };

/** Sets the site-level role for a Discord user by manipulating the
 *  mod/admin role IDs in Discord, then mirroring the change to the local
 *  users row. The bot's guildMemberUpdate handler will also fire — this
 *  just keeps us snappy. */
export async function setSiteRoleAction(opts: {
  discordId: string;
  role: "contributor" | "mod" | "admin";
}): Promise<SetRoleResult> {
  await assertAdminAction();

  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
  const modRoleId = process.env.DISCORD_MOD_ROLE_ID;
  if (!adminRoleId || !modRoleId) {
    return { ok: false, message: "DISCORD_ADMIN_ROLE_ID / DISCORD_MOD_ROLE_ID not configured" };
  }

  let member;
  try {
    member = await getGuildMember(opts.discordId);
  } catch (e) {
    return { ok: false, message: `Discord lookup failed: ${(e as Error).message}` };
  }

  const next = new Set(member.roles);
  // Strip both staff role IDs, then add the one we want (if any)
  next.delete(adminRoleId);
  next.delete(modRoleId);
  if (opts.role === "admin") next.add(adminRoleId);
  if (opts.role === "mod") next.add(modRoleId);

  try {
    await setMemberRoles(opts.discordId, Array.from(next), `site role override → ${opts.role}`);
  } catch (e) {
    return { ok: false, message: `Discord PATCH failed: ${(e as Error).message}` };
  }

  // Mirror locally so the UI reflects the change immediately
  await db.update(users)
    .set({ role: opts.role, discordRoles: Array.from(next) })
    .where(eq(users.discordId, opts.discordId));

  revalidatePath("/ops/discord");
  revalidatePath("/ops");
  return { ok: true, message: `Role set to ${opts.role}`, newRole: opts.role };
}

export type AnnounceState = {
  ok: boolean;
  message: string;
  messageId?: string;
  at?: string;
};

export async function announceAction(
  _prev: AnnounceState | null,
  formData: FormData,
): Promise<AnnounceState> {
  await assertAdminAction();
  const channelId = String(formData.get("channelId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!channelId.match(/^\d{10,25}$/)) {
    return { ok: false, message: "Invalid channel id" };
  }
  if (!content || content.length > 1900) {
    return { ok: false, message: "Content must be 1–1900 characters" };
  }
  try {
    const res = await sendChannelMessage(channelId, content);
    return { ok: true, message: "Posted.", messageId: res.id, at: new Date().toISOString() };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
