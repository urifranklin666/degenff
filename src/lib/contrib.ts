import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { users, feats } = schema;

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

export type ContributorFeat = {
  slug: string;
  title: string;
  summary: string | null;
  heroImagePath: string | null;
  publishedAt: string | null;
  tags: string[];
};

export async function getContributorWork(userId: string): Promise<{
  feats: ContributorFeat[];
}> {
  const featRows = await db.query.feats.findMany({
    where: and(eq(feats.userId, userId), eq(feats.status, "approved")),
    orderBy: [desc(feats.publishedAt)],
    limit: 200,
  });

  return {
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
