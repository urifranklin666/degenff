import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { submissions, feats } = schema;

const TAG_RE = /^[a-z0-9](?:[a-z0-9 _.-]{0,62}[a-z0-9])?$/i;

export function isValidTag(tag: string): boolean {
  return TAG_RE.test(tag);
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export type BrowseSubmission = {
  id: string;
  title: string;
  medium: string;
  nsfw: boolean;
  thumbPath: string | null;
  featured: boolean;
  authorHandle: string | null;
  decidedAt: string | null;
  tags: string[];
};

export type BrowseFeat = {
  slug: string;
  title: string;
  summary: string | null;
  heroImagePath: string | null;
  authorHandle: string | null;
  publishedAt: string | null;
  tags: string[];
};

/** Submissions whose tags array contains `tag`. Uses jsonb containment. */
export async function submissionsByTag(tag: string, limit = 100): Promise<BrowseSubmission[]> {
  const rows = await db.query.submissions.findMany({
    where: and(
      eq(submissions.status, "approved"),
      sql`${submissions.tags} @> ${JSON.stringify([tag])}::jsonb`,
    ),
    with: { author: { columns: { handle: true } } },
    orderBy: [desc(submissions.decidedAt)],
    limit,
  });
  return rows.map((s) => {
    const firstImage = (s.files ?? []).find((f) => f.mime.startsWith("image/"));
    return {
      id: s.id,
      title: s.title,
      medium: s.medium,
      nsfw: s.nsfw,
      thumbPath: firstImage?.path ?? null,
      featured: s.featured,
      authorHandle: s.author?.handle ?? null,
      decidedAt: s.decidedAt?.toISOString() ?? null,
      tags: s.tags ?? [],
    };
  });
}

export async function featsByTag(tag: string, limit = 100): Promise<BrowseFeat[]> {
  const rows = await db.query.feats.findMany({
    where: and(
      eq(feats.status, "approved"),
      sql`${feats.tags} @> ${JSON.stringify([tag])}::jsonb`,
    ),
    with: { author: { columns: { handle: true } } },
    orderBy: [desc(feats.publishedAt)],
    limit,
  });
  return rows.map((f) => ({
    slug: f.slug,
    title: f.title,
    summary: f.summary,
    heroImagePath: f.heroImagePath,
    authorHandle: f.author?.handle ?? null,
    publishedAt: f.publishedAt?.toISOString() ?? null,
    tags: f.tags ?? [],
  }));
}

/** Featured submissions, most-recently-decided first. */
export async function featuredSubmissions(limit = 60): Promise<BrowseSubmission[]> {
  const rows = await db.query.submissions.findMany({
    where: and(eq(submissions.status, "approved"), eq(submissions.featured, true)),
    with: { author: { columns: { handle: true } } },
    orderBy: [desc(submissions.decidedAt)],
    limit,
  });
  return rows.map((s) => {
    const firstImage = (s.files ?? []).find((f) => f.mime.startsWith("image/"));
    return {
      id: s.id,
      title: s.title,
      medium: s.medium,
      nsfw: s.nsfw,
      thumbPath: firstImage?.path ?? null,
      featured: true,
      authorHandle: s.author?.handle ?? null,
      decidedAt: s.decidedAt?.toISOString() ?? null,
      tags: s.tags ?? [],
    };
  });
}
