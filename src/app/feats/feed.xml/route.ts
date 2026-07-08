import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { renderAtom, type FeedEntry } from "@/lib/feeds";

const { feats } = schema;
const SITE = process.env.AUTH_URL?.replace(/\/$/, "") ?? "https://degeneratefuckface.com";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  const rows = await db.query.feats.findMany({
    where: eq(feats.status, "approved"),
    with: { author: { columns: { handle: true } } },
    orderBy: [desc(feats.publishedAt)],
    limit: 50,
  });

  const entries: FeedEntry[] = rows.map((f) => ({
    id: `${SITE}/feats/${f.slug}`,
    title: f.title,
    url: `${SITE}/feats/${f.slug}`,
    updated: (f.publishedAt ?? f.updatedAt).toISOString(),
    summary: f.summary ?? "",
    author: f.author?.handle ? `@${f.author.handle}` : undefined,
  }));

  const xml = renderAtom({
    title: "degeneratefuckface.com — feats",
    subtitle: "coding-feat writeups, freshest first",
    feedUrl: `${SITE}/feats/feed.xml`,
    siteUrl: `${SITE}/feats`,
    updated: entries[0]?.updated ?? new Date().toISOString(),
    entries,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
