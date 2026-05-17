import { db } from "@/db";
import { feats } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: "Feats" };
export const dynamic = "force-dynamic";

export default async function FeatsPage() {
  const published = await db
    .select()
    .from(feats)
    .where(eq(feats.status, "approved"))
    .orderBy(desc(feats.publishedAt))
    .limit(40);

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Long-Form</p>
        <h1 className="section-title">Coding Feats</h1>
        <p className="lede" style={{ marginBottom: "1.25rem" }}>
          The case-study format for projects that finished. Repos, demos, post-mortems.
          Weird hardware especially welcome.
        </p>
        <p style={{ marginBottom: "2.5rem" }}>
          <Link href="/feats/new" className="btn no-underline">Submit A Feat</Link>
        </p>

        {published.length === 0 ? (
          <div className="tile" style={{ minHeight: 0 }}>
            <span className="tile-glyph">⬡</span>
            <h3 className="tile-title">Nothing catalogued yet.</h3>
            <p className="tile-body">
              The first published feat will live here. Then more.
            </p>
          </div>
        ) : (
          <div className="tiles">
            {published.map((f, i) => (
              <article className="tile" key={f.id}>
                <span className="tile-index">{String(i + 1).padStart(2, "0")}</span>
                <span className="tile-glyph" aria-hidden>⬢</span>
                <h3 className="tile-title">
                  <Link href={`/feats/${f.slug}`} className="no-underline">{f.title}</Link>
                </h3>
                {f.summary && <p className="tile-body">{f.summary}</p>}
                {f.tags && f.tags.length > 0 && (
                  <div className="tile-tags">
                    {f.tags.slice(0, 4).map((t) => <span key={t}>{t}</span>)}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
