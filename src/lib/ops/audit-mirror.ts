import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendChannelPayload } from "./discord-rest";

const { users } = schema;

/** Web-side mirror of src/discord/audit.ts. Posts the same kind of audit
 *  line to DISCORD_AUDIT_CHANNEL_ID, but via REST instead of via the bot's
 *  discord.js Client (which only the bot process has). */

type ModAction = "approve" | "feature" | "reject" | "withdraw" | "unfeature";

const GLYPH: Record<ModAction, string> = {
  approve:   "✔",
  feature:   "★",
  reject:    "✘",
  withdraw:  "↘",
  unfeature: "↩",
};

const COLOR: Record<ModAction, number> = {
  approve:   0xff2222,
  feature:   0xff2e7c,
  reject:    0x4a0000,
  withdraw:  0x2b0000,
  unfeature: 0x8a857f,
};

export async function postAuditLine(ev: {
  modUserId: string;
  action: ModAction;
  kind: "submission" | "feat";
  itemId: string;
  itemTitle: string;
  itemUrl?: string;
}): Promise<void> {
  const channelId = process.env.DISCORD_AUDIT_CHANNEL_ID;
  if (!channelId) return;

  const mod = await db.query.users.findFirst({ where: eq(users.id, ev.modUserId) });
  const modHandle = mod?.handle ?? "?";

  const desc =
    `${GLYPH[ev.action]} **@${modHandle}** ${ev.action}d ${ev.kind} **${ev.itemTitle.slice(0, 80)}** _(via web)_` +
    (ev.itemUrl ? ` · [open](${ev.itemUrl})` : "");

  await sendChannelPayload(channelId, {
    embeds: [
      {
        color: COLOR[ev.action],
        description: desc,
        footer: { text: `${ev.kind} ${ev.itemId}` },
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
