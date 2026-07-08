import { type Client, type TextChannel, ChannelType, EmbedBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { showcaseEmbed, submissionShowcaseRow, featShowcaseRow } from "./embeds";
import { logAudit } from "./audit";

/**
 * Shared mod-action core. Used by:
 *   - handlers.ts (button click in mod queue)
 *   - tools.ts (The Barker invoking on behalf of a mod talking to it in chat)
 *
 * Each function returns an ActionResult. Callers handle the interaction- or
 * chat-shaped response themselves; the DB writes, showcase mirroring, and
 * audit logging live in here so both call sites stay in sync.
 */

const SITE = "https://degeneratefuckface.com";
const COLOR = {
  approved: 0xff2222,
  featured: 0xff2e7c,
};

const { submissions, feats, modActions, users } = schema;

export type ActionContext = {
  client: Client;
  modUserId: string;
  source: "discord" | "barker";
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type SubmissionInfo = {
  id: string;
  title: string;
  authorHandle: string;
  url: string;
  featured: boolean;
};

type FeatInfo = {
  id: string;
  slug: string;
  title: string;
  url: string;
  featured: boolean;
};

/* ── submissions ─────────────────────────────────────────────────────── */

export async function approveSubmission(
  ctx: ActionContext,
  submissionId: string,
  opts: { feature?: boolean } = {},
): Promise<ActionResult<SubmissionInfo>> {
  const feature = !!opts.feature;
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!s) return { ok: false, error: "Submission not found." };
  if (s.status === "approved") return { ok: false, error: "Already approved." };

  await db.update(submissions)
    .set({
      status: "approved",
      featured: feature,
      decidedAt: new Date(),
      decidedBy: ctx.modUserId,
    })
    .where(eq(submissions.id, submissionId));

  await db.insert(modActions).values({
    submissionId,
    modUserId: ctx.modUserId,
    action: feature ? "feature" : "approve",
    source: ctx.source,
  });

  const author = s.userId
    ? await db.query.users.findFirst({ where: eq(users.id, s.userId) })
    : null;
  const authorHandle = author?.handle ?? "anon";

  const showcaseChannelId = process.env.DISCORD_SHOWCASE_CHANNEL_ID;
  if (showcaseChannelId) {
    const ch = await ctx.client.channels.fetch(showcaseChannelId).catch(() => null);
    if (ch && ch.type === ChannelType.GuildText) {
      const embed = showcaseEmbed(
        { ...s, featured: feature, status: "approved" },
        authorHandle,
      );
      const showMsg = await (ch as TextChannel).send({
        embeds: [embed],
        components: [submissionShowcaseRow(submissionId, feature)],
      }).catch((err) => { console.error("[showcase] send failed:", err); return null; });
      if (showMsg) {
        await showMsg.startThread({
          name: `discuss · ${s.title.slice(0, 80)}`,
          autoArchiveDuration: 10080,
        }).catch((err) => console.error("[thread] start failed:", err));
      }
    }
  }

  await logAudit(ctx.client, {
    modUserId: ctx.modUserId,
    action: feature ? "feature" : "approve",
    kind: "submission",
    itemId: submissionId,
    itemTitle: s.title,
    itemUrl: `${SITE}/submissions/${submissionId}`,
  });

  return {
    ok: true,
    data: {
      id: submissionId,
      title: s.title,
      authorHandle,
      url: `${SITE}/submissions/${submissionId}`,
      featured: feature,
    },
  };
}

export async function rejectSubmission(
  ctx: ActionContext,
  submissionId: string,
  reason?: string,
): Promise<ActionResult<SubmissionInfo>> {
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!s) return { ok: false, error: "Submission not found." };

  const finalReason = (reason && reason.trim()) || `Rejected via ${ctx.source} (no reason given)`;

  await db.update(submissions)
    .set({
      status: "rejected",
      decidedAt: new Date(),
      decidedBy: ctx.modUserId,
      rejectionReason: finalReason,
    })
    .where(eq(submissions.id, submissionId));

  await db.insert(modActions).values({
    submissionId,
    modUserId: ctx.modUserId,
    action: "reject",
    reason: finalReason,
    source: ctx.source,
  });

  await logAudit(ctx.client, {
    modUserId: ctx.modUserId,
    action: "reject",
    kind: "submission",
    itemId: submissionId,
    itemTitle: s.title,
  });

  return {
    ok: true,
    data: {
      id: submissionId,
      title: s.title,
      authorHandle: "—",
      url: `${SITE}/submissions/${submissionId}`,
      featured: false,
    },
  };
}

export async function withdrawSubmission(
  ctx: ActionContext,
  submissionId: string,
): Promise<ActionResult<SubmissionInfo>> {
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!s) return { ok: false, error: "Submission not found." };
  if (s.status === "withdrawn") return { ok: false, error: "Already withdrawn." };

  await db.update(submissions)
    .set({ status: "withdrawn", featured: false })
    .where(eq(submissions.id, submissionId));

  await db.insert(modActions).values({
    submissionId,
    modUserId: ctx.modUserId,
    action: "withdraw",
    source: ctx.source,
  });

  await logAudit(ctx.client, {
    modUserId: ctx.modUserId,
    action: "withdraw",
    kind: "submission",
    itemId: submissionId,
    itemTitle: s.title,
  });

  return {
    ok: true,
    data: {
      id: submissionId,
      title: s.title,
      authorHandle: "—",
      url: `${SITE}/submissions/${submissionId}`,
      featured: false,
    },
  };
}

export async function unfeatureSubmission(
  ctx: ActionContext,
  submissionId: string,
): Promise<ActionResult<SubmissionInfo>> {
  const s = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!s) return { ok: false, error: "Submission not found." };
  if (!s.featured) return { ok: false, error: "Already unfeatured." };

  await db.update(submissions)
    .set({ featured: false })
    .where(eq(submissions.id, submissionId));

  await db.insert(modActions).values({
    submissionId,
    modUserId: ctx.modUserId,
    action: "unfeature",
    source: ctx.source,
  });

  await logAudit(ctx.client, {
    modUserId: ctx.modUserId,
    action: "unfeature",
    kind: "submission",
    itemId: submissionId,
    itemTitle: s.title,
    itemUrl: `${SITE}/submissions/${submissionId}`,
  });

  const author = s.userId
    ? await db.query.users.findFirst({ where: eq(users.id, s.userId) })
    : null;

  return {
    ok: true,
    data: {
      id: submissionId,
      title: s.title,
      authorHandle: author?.handle ?? "anon",
      url: `${SITE}/submissions/${submissionId}`,
      featured: false,
    },
  };
}

/* ── feats ───────────────────────────────────────────────────────────── */

export async function approveFeat(
  ctx: ActionContext,
  featId: string,
  opts: { feature?: boolean } = {},
): Promise<ActionResult<FeatInfo>> {
  const feature = !!opts.feature;
  const f = await db.query.feats.findFirst({ where: eq(feats.id, featId) });
  if (!f) return { ok: false, error: "Feat not found." };
  if (f.status === "approved") return { ok: false, error: "Already approved." };

  await db.update(feats)
    .set({ status: "approved", publishedAt: new Date() })
    .where(eq(feats.id, featId));

  await db.insert(modActions).values({
    featId,
    modUserId: ctx.modUserId,
    action: feature ? "feature" : "approve",
    source: ctx.source,
  });

  const author = f.userId
    ? await db.query.users.findFirst({ where: eq(users.id, f.userId) })
    : null;
  const authorHandle = author?.handle ?? "anon";

  const featsChannelId = process.env.DISCORD_FEATS_CHANNEL_ID;
  if (featsChannelId) {
    const ch = await ctx.client.channels.fetch(featsChannelId).catch(() => null);
    if (ch && ch.type === ChannelType.GuildText) {
      const embed = new EmbedBuilder()
        .setColor(feature ? COLOR.featured : COLOR.approved)
        .setTitle(`⬢  ${f.title}`)
        .setURL(`${SITE}/feats/${f.slug}`)
        .setDescription((f.summary ?? "").slice(0, 1900))
        .addFields(
          { name: "by", value: `@${authorHandle}`, inline: true },
          f.repoUrl ? { name: "repo", value: f.repoUrl, inline: true } : { name: "​", value: "​", inline: true },
          f.demoUrl ? { name: "demo", value: f.demoUrl, inline: true } : { name: "​", value: "​", inline: true },
        );
      if (f.heroImagePath) embed.setImage(`${SITE}/uploads/${f.heroImagePath}`);
      const featMsg = await (ch as TextChannel).send({
        embeds: [embed],
        components: [featShowcaseRow(f.slug, f.id)],
      }).catch((err) => { console.error("[feats showcase] send failed:", err); return null; });
      if (featMsg) {
        await featMsg.startThread({
          name: `discuss · ${f.title.slice(0, 80)}`,
          autoArchiveDuration: 10080,
        }).catch((err) => console.error("[thread] start failed:", err));
      }
    }
  }

  await logAudit(ctx.client, {
    modUserId: ctx.modUserId,
    action: feature ? "feature" : "approve",
    kind: "feat",
    itemId: featId,
    itemTitle: f.title,
    itemUrl: `${SITE}/feats/${f.slug}`,
  });

  return {
    ok: true,
    data: {
      id: featId,
      slug: f.slug,
      title: f.title,
      url: `${SITE}/feats/${f.slug}`,
      featured: feature,
    },
  };
}

export async function rejectFeat(
  ctx: ActionContext,
  featId: string,
  reason?: string,
): Promise<ActionResult<FeatInfo>> {
  const f = await db.query.feats.findFirst({ where: eq(feats.id, featId) });
  if (!f) return { ok: false, error: "Feat not found." };

  await db.update(feats).set({ status: "rejected" }).where(eq(feats.id, featId));
  await db.insert(modActions).values({
    featId,
    modUserId: ctx.modUserId,
    action: "reject",
    reason: reason?.trim() || null,
    source: ctx.source,
  });
  await logAudit(ctx.client, {
    modUserId: ctx.modUserId,
    action: "reject",
    kind: "feat",
    itemId: featId,
    itemTitle: f.title,
  });

  return {
    ok: true,
    data: {
      id: featId,
      slug: f.slug,
      title: f.title,
      url: `${SITE}/feats/${f.slug}`,
      featured: false,
    },
  };
}

export async function withdrawFeat(
  ctx: ActionContext,
  featId: string,
): Promise<ActionResult<FeatInfo>> {
  const f = await db.query.feats.findFirst({ where: eq(feats.id, featId) });
  if (!f) return { ok: false, error: "Feat not found." };
  if (f.status === "withdrawn") return { ok: false, error: "Already withdrawn." };

  await db.update(feats).set({ status: "withdrawn" }).where(eq(feats.id, featId));
  await db.insert(modActions).values({
    featId,
    modUserId: ctx.modUserId,
    action: "withdraw",
    source: ctx.source,
  });
  await logAudit(ctx.client, {
    modUserId: ctx.modUserId,
    action: "withdraw",
    kind: "feat",
    itemId: featId,
    itemTitle: f.title,
  });

  return {
    ok: true,
    data: {
      id: featId,
      slug: f.slug,
      title: f.title,
      url: `${SITE}/feats/${f.slug}`,
      featured: false,
    },
  };
}
