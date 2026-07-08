import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { users, submissions, feats } = schema;

export type ContributorProfile = {
  id: string;
  handle: string;
  name: string | null;
  image: string | null;
  role: "visitor" | "contributor" | "mod" | "admin";
  banned: boolean;
  joinedAt: string;
};

export async function getContributorByHandle(handle: string): Promise<ContributorProfile | null> {
  const u = await db.query.users.findFirst({
    where: eq(users.handle, handle),
  });
  if (!u) return null;
  return {
    id: u.id,
    handle: u.handle,
    name: u.name,
    image: u.image,
    role: u.role,
    banned: u.banned,
    joinedAt: u.createdAt.toISOString(),
  };
}

export type ContributorSubmission = {
  id: string;
  title: string;
  medium: string;
  nsfw: boolean;
  thumbPath: string | null;
  featured: boolean;
  decidedAt: string | null;
  tags: string[];
};

export type ContributorFeat = {
  slug: string;
  title: string;
  summary: string | null;
  heroImagePath: string | null;
  publishedAt: string | null;
  tags: string[];
};

export async function getContributorWork(userId: string): Promise<{
  subs: ContributorSubmission[];
  feats: ContributorFeat[];
}> {
  const [subRows, featRows] = await Promise.all([
    db.query.submissions.findMany({
      where: and(eq(submissions.userId, userId), eq(submissions.status, "approved")),
      orderBy: [desc(submissions.decidedAt)],
      limit: 200,
    }),
    db.query.feats.findMany({
      where: and(eq(feats.userId, userId), eq(feats.status, "approved")),
      orderBy: [desc(feats.publishedAt)],
      limit: 200,
    }),
  ]);

  return {
    subs: subRows.map((s) => {
      const firstImage = (s.files ?? []).find((f) => f.mime.startsWith("image/"));
      return {
        id: s.id,
        title: s.title,
        medium: s.medium,
        nsfw: s.nsfw,
        thumbPath: firstImage?.path ?? null,
        featured: s.featured,
        decidedAt: s.decidedAt?.toISOString() ?? null,
        tags: s.tags ?? [],
      };
    }),
    feats: featRows.map((f) => ({
      slug: f.slug,
      title: f.title,
      summary: f.summary,
      heroImagePath: f.heroImagePath,
      publishedAt: f.publishedAt?.toISOString() ?? null,
      tags: f.tags ?? [],
    })),
  };
}
