import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { renderAtom, type FeedEntry } from "@/lib/feeds";

const { submissions } = schema;
const SITE = process.env.AUTH_URL?.replace(/\/$/, "") ?? "https://degeneratefuckface.com";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  const rows = await db.query.submissions.findMany({
    where: eq(submissions.status, "approved"),
    with: { author: { columns: { handle: true } } },
    orderBy: [desc(submissions.decidedAt)],
    limit: 50,
  });

  const entries: FeedEntry[] = rows.map((s) => ({
    id: `${SITE}/submissions/${s.id}`,
    title: s.title,
    url: `${SITE}/submissions/${s.id}`,
    updated: (s.decidedAt ?? s.createdAt).toISOString(),
    summary: (s.body ?? "").slice(0, 400),
    author: s.author?.handle ? `@${s.author.handle}` : undefined,
  }));

  const xml = renderAtom({
    title: "degeneratefuckface.com — submissions",
    subtitle: "approved submissions, freshest first",
    feedUrl: `${SITE}/feed.xml`,
    siteUrl: `${SITE}/submissions`,
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
