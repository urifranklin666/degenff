import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  sendChannelPayload,
  startMessageThread,
  type MessagePayload,
} from "./discord-rest";
import { postAuditLine } from "./audit-mirror";

const { feats, modActions, users } = schema;

const SITE = "https://degeneratefuckface.com";

/* ── color constants (match src/discord/handlers.ts COLOR) ───────────── */

const COLOR = {
  pending:   0xcc0000,
  approved:  0xff2222,
  featured:  0xff2e7c,
  rejected:  0x4a0000,
  withdrawn: 0x2b0000,
};

/* ── embed builders (REST-shaped JSON, no discord.js dependency) ─────── */

type Feat = typeof schema.feats.$inferSelect;

function featShowcasePayload(f: Feat, authorHandle: string, featured: boolean): MessagePayload {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "by", value: `@${authorHandle}`, inline: true },
  ];
  if (f.repoUrl) fields.push({ name: "repo", value: f.repoUrl, inline: true });
  if (f.demoUrl) fields.push({ name: "demo", value: f.demoUrl, inline: true });

  return {
    embeds: [
      {
        color: featured ? COLOR.featured : COLOR.approved,
        title: `⬢  ${f.title}`,
        url: `${SITE}/feats/${f.slug}`,
        description: (f.summary ?? "").slice(0, 1900),
        fields,
        ...(f.heroImagePath ? { image: { url: `${SITE}/uploads/${f.heroImagePath}` } } : {}),
        footer: { text: `feat ${f.id} · approved via web` },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 4, label: "Withdraw", custom_id: `feat:withdraw:${f.id}` },
          { type: 2, style: 5, label: "Open on site", url: `${SITE}/feats/${f.slug}` },
        ],
      },
    ],
  };
}

/* ── shared mirror helpers ───────────────────────────────────────────── */

async function tryPostShowcase(
  channelId: string | undefined,
  payload: MessagePayload,
  threadName: string,
): Promise<void> {
  if (!channelId) return;
  try {
    const msg = await sendChannelPayload(channelId, payload);
    await startMessageThread(channelId, msg.id, `discuss · ${threadName}`).catch(() => {});
  } catch (err) {
    console.warn("[ops/queue] showcase post failed:", (err as Error).message);
  }
}

async function tryPostAudit(args: Parameters<typeof postAuditLine>[0]): Promise<void> {
  try {
    await postAuditLine(args);
  } catch (err) {
    console.warn("[ops/queue] audit post failed:", (err as Error).message);
  }
}

export type ActionResult = { ok: boolean; reason?: string };

/* ── feats ───────────────────────────────────────────────────────────── */

export async function approveFeat(
  featId: string,
  modUserId: string,
  modHandle: string,
  feature = false,
): Promise<ActionResult> {
  const f = await db.query.feats.findFirst({ where: eq(feats.id, featId) });
  if (!f) return { ok: false, reason: "missing" };
  if (f.status === "approved") return { ok: false, reason: "no-change" };

  await db.update(feats)
    .set({ status: "approved", publishedAt: new Date() })
    .where(eq(feats.id, featId));
  await db.insert(modActions).values({
    featId, modUserId,
    action: feature ? "feature" : "approve",
    source: "site",
  });

  const author = f.userId
    ? await db.query.users.findFirst({ where: eq(users.id, f.userId) })
    : null;
  const handle = author?.handle ?? "anon";

  // Showcase mirror to the feats channel:
  await tryPostShowcase(
    process.env.DISCORD_FEATS_CHANNEL_ID,
    featShowcasePayload(f, handle, feature),
    f.title,
  );

  await tryPostAudit({
    modUserId, action: feature ? "feature" : "approve", kind: "feat",
    itemId: featId, itemTitle: f.title,
    itemUrl: `${SITE}/feats/${f.slug}`,
  });

  void modHandle;
  return { ok: true };
}

export async function rejectFeat(
  featId: string,
  modUserId: string,
  modHandle: string,
): Promise<ActionResult> {
  const f = await db.query.feats.findFirst({ where: eq(feats.id, featId) });
  if (!f) return { ok: false, reason: "missing" };
  if (f.status === "rejected") return { ok: false, reason: "no-change" };

  await db.update(feats).set({ status: "rejected" }).where(eq(feats.id, featId));
  await db.insert(modActions).values({
    featId, modUserId, action: "reject", source: "site",
  });

  await tryPostAudit({
    modUserId, action: "reject", kind: "feat",
    itemId: featId, itemTitle: f.title,
  });

  void modHandle;
  return { ok: true };
}

export async function withdrawFeat(
  featId: string,
  modUserId: string,
  modHandle: string,
): Promise<ActionResult> {
  const f = await db.query.feats.findFirst({ where: eq(feats.id, featId) });
  if (!f) return { ok: false, reason: "missing" };
  if (f.status === "withdrawn") return { ok: false, reason: "no-change" };

  await db.update(feats).set({ status: "withdrawn" }).where(eq(feats.id, featId));
  await db.insert(modActions).values({
    featId, modUserId, action: "withdraw", source: "site",
  });

  await tryPostAudit({
    modUserId, action: "withdraw", kind: "feat",
    itemId: featId, itemTitle: f.title,
  });

  void modHandle;
  return { ok: true };
}
