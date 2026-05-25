import { type Client, EmbedBuilder, type TextChannel, ChannelType } from "discord.js";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { users } = schema;

/**
 * Audit log mirror. Posts a one-line entry to DISCORD_AUDIT_CHANNEL_ID
 * every time a mod takes an action. No-ops if the env var is unset.
 */

type ModAction = "approve" | "feature" | "reject" | "withdraw" | "unfeature";

interface AuditEvent {
  modUserId: string;          // local site user id
  action: ModAction;
  kind: "submission" | "feat";
  itemId: string;
  itemTitle: string;
  itemUrl?: string;
}

const ACTION_GLYPH: Record<ModAction, string> = {
  approve:   "✔",
  feature:   "★",
  reject:    "✘",
  withdraw:  "↘",
  unfeature: "↩",
};

const ACTION_COLOR: Record<ModAction, number> = {
  approve:   0xff2222,
  feature:   0xff2e7c,
  reject:    0x4a0000,
  withdraw:  0x2b0000,
  unfeature: 0x8a857f,
};

export async function logAudit(client: Client, ev: AuditEvent) {
  const channelId = process.env.DISCORD_AUDIT_CHANNEL_ID;
  if (!channelId) return;

  const ch = await client.channels.fetch(channelId).catch(() => null);
  if (!ch || ch.type !== ChannelType.GuildText) return;

  const mod = await db.query.users.findFirst({ where: eq(users.id, ev.modUserId) });
  const modHandle = mod?.handle ?? "?";

  const glyph = ACTION_GLYPH[ev.action];
  const color = ACTION_COLOR[ev.action];

  const desc =
    `${glyph} **@${modHandle}** ${ev.action}d ${ev.kind} **${ev.itemTitle.slice(0, 80)}**` +
    (ev.itemUrl ? ` · [open](${ev.itemUrl})` : "");

  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(desc)
    .setFooter({ text: `${ev.kind} ${ev.itemId}` })
    .setTimestamp();

  await (ch as TextChannel).send({ embeds: [embed] })
    .catch((err) => console.error("[audit] send failed:", err));
}
