import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { feats } = schema;

const TAG_RE = /^[a-z0-9](?:[a-z0-9 _.-]{0,62}[a-z0-9])?$/i;

export function isValidTag(tag: string): boolean {
  return TAG_RE.test(tag);
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export type BrowseFeat = {
  slug: string;
  title: string;
  summary: string | null;
  heroImagePath: string | null;
  authorHandle: string | null;
  publishedAt: string | null;
  tags: string[];
};

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
