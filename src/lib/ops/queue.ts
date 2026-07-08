import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  editChannelMessage,
  sendChannelPayload,
  startMessageThread,
  type MessagePayload,
} from "./discord-rest";
import { postAuditLine } from "./audit-mirror";

const { submissions, feats, modActions, users } = schema;

const SITE = "https://degeneratefuckface.com";

/* ── color constants (match src/discord/handlers.ts COLOR) ───────────── */

const COLOR = {
  pending:   0xcc0000,
  approved:  0xff2222,
  featured:  0xff2e7c,
  rejected:  0x4a0000,
  withdrawn: 0x2b0000,
};

const MEDIUM_GLYPH: Record<string, string> = {
  image: "◈", audio: "◐", video: "▶", text: "✎",
  code: "⌬", link: "↗", mixed: "✻",
};

/* ── embed builders (REST-shaped JSON, no discord.js dependency) ─────── */

type Submission = typeof schema.submissions.$inferSelect;
type Feat = typeof schema.feats.$inferSelect;

function submissionShowcasePayload(s: Submission, authorHandle: string, featured: boolean): MessagePayload {
  const glyph = MEDIUM_GLYPH[s.medium] ?? "◇";
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "by", value: `@${authorHandle}`, inline: true },
    { name: "medium", value: s.medium, inline: true },
    { name: "nsfw", value: s.nsfw ? "yes" : "no", inline: true },
  ];
  if (s.tags && s.tags.length > 0) {
    fields.push({
      name: "tags",
      value: s.tags.slice(0, 12).map((t) => `\`${t}\``).join(" "),
    });
  }
  if (s.linkUrl) fields.push({ name: "link", value: s.linkUrl });

  const firstImage = (s.files ?? []).find((f) => f.mime.startsWith("image/"));

  // Showcase row: optional unfeature + withdraw + open-on-site
  const buttons: Array<Record<string, unknown>> = [];
  if (featured) {
    buttons.push({ type: 2, style: 2, label: "Unfeature", custom_id: `sub:unfeature:${s.id}` });
  }
  buttons.push(
    { type: 2, style: 4, label: "Withdraw", custom_id: `sub:withdraw:${s.id}` },
    { type: 2, style: 5, label: "Open on site", url: `${SITE}/submissions/${s.id}` },
  );

  return {
    embeds: [
      {
        color: featured ? COLOR.featured : COLOR.approved,
        title: `${glyph}  ${s.title}`,
        url: `${SITE}/submissions/${s.id}`,
        description: (s.body ?? "_no body_").slice(0, 1900),
        fields,
        ...(firstImage ? { image: { url: `${SITE}/uploads/${firstImage.path}` } } : {}),
        footer: { text: `id ${s.id} · approved via web` },
      },
    ],
    components: [{ type: 1, components: buttons }],
  };
}

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

async function tryEditQueueMessage(
  channelId: string | null | undefined,
  messageId: string | null | undefined,
  payload: MessagePayload,
): Promise<void> {
  if (!channelId || !messageId) return;
  try {
    await editChannelMessage(channelId, messageId, payload);
  } catch (err) {
    console.warn("[ops/queue] queue-msg edit failed:", (err as Error).message);
  }
}

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

/* ── submissions ─────────────────────────────────────────────────────── */

export async function approveSubmission(
  submissionId: string,
  modUserId: string,
  modHandle: string,
  feature = false,
): Promise<ActionResult> {
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!s) return { ok: false, reason: "missing" };
  if (s.status === "approved" && s.featured === feature) {
    return { ok: false, reason: "no-change" };
  }

  await db.update(submissions)
    .set({ status: "approved", featured: feature, decidedAt: new Date(), decidedBy: modUserId })
    .where(eq(submissions.id, submissionId));
  await db.insert(modActions).values({
    submissionId,
    modUserId,
    action: feature ? "feature" : "approve",
    source: "site",
  });

  // Mirror to Discord (best-effort)
  const author = s.userId
    ? await db.query.users.findFirst({ where: eq(users.id, s.userId) })
    : null;
  const handle = author?.handle ?? "anon";

  await tryEditQueueMessage(s.discordChannelId, s.discordMessageId, {
    content: `✔ ${feature ? "FEATURED" : "Approved"} by @${modHandle} (via web)`,
    embeds: [],
    components: [],
  });

  await tryPostShowcase(
    process.env.DISCORD_SHOWCASE_CHANNEL_ID,
    submissionShowcasePayload({ ...s, featured: feature, status: "approved" }, handle, feature),
    s.title,
  );

  await tryPostAudit({
    modUserId,
    action: feature ? "feature" : "approve",
    kind: "submission",
    itemId: submissionId,
    itemTitle: s.title,
    itemUrl: `${SITE}/submissions/${submissionId}`,
  });

  return { ok: true };
}

export async function rejectSubmission(
  submissionId: string,
  modUserId: string,
  modHandle: string,
  reason?: string,
): Promise<ActionResult> {
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!s) return { ok: false, reason: "missing" };
  if (s.status === "rejected") return { ok: false, reason: "no-change" };

  await db.update(submissions)
    .set({
      status: "rejected",
      decidedAt: new Date(),
      decidedBy: modUserId,
      rejectionReason: reason || "Rejected via web (no reason given)",
    })
    .where(eq(submissions.id, submissionId));
  await db.insert(modActions).values({
    submissionId, modUserId, action: "reject", source: "site",
  });

  await tryEditQueueMessage(s.discordChannelId, s.discordMessageId, {
    content: `✘ Rejected by @${modHandle} (via web)`,
    embeds: [],
    components: [],
  });

  await tryPostAudit({
    modUserId, action: "reject", kind: "submission",
    itemId: submissionId, itemTitle: s.title,
  });

  return { ok: true };
}

export async function withdrawSubmission(
  submissionId: string,
  modUserId: string,
  modHandle: string,
): Promise<ActionResult> {
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!s) return { ok: false, reason: "missing" };
  if (s.status === "withdrawn") return { ok: false, reason: "no-change" };

  await db.update(submissions)
    .set({ status: "withdrawn", featured: false })
    .where(eq(submissions.id, submissionId));
  await db.insert(modActions).values({
    submissionId, modUserId, action: "withdraw", source: "site",
  });

  await tryEditQueueMessage(s.discordChannelId, s.discordMessageId, {
    content: `↘ Withdrawn by @${modHandle} (via web)`,
    embeds: [],
    components: [],
  });

  await tryPostAudit({
    modUserId, action: "withdraw", kind: "submission",
    itemId: submissionId, itemTitle: s.title,
  });

  return { ok: true };
}

export async function unfeatureSubmission(
  submissionId: string,
  modUserId: string,
): Promise<ActionResult> {
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!s) return { ok: false, reason: "missing" };
  if (!s.featured) return { ok: false, reason: "no-change" };

  await db.update(submissions)
    .set({ featured: false })
    .where(eq(submissions.id, submissionId));
  await db.insert(modActions).values({
    submissionId, modUserId, action: "unfeature", source: "site",
  });

  await tryPostAudit({
    modUserId, action: "unfeature", kind: "submission",
    itemId: submissionId, itemTitle: s.title,
    itemUrl: `${SITE}/submissions/${submissionId}`,
  });

  return { ok: true };
}

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

  // Feats don't carry a queue-message ID in schema, so no in-place edit.
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
