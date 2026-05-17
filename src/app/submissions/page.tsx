import Link from "next/link";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const metadata = { title: "Submissions" };
export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const approved = await db
    .select()
    .from(submissions)
    .where(eq(submissions.status, "approved"))
    .orderBy(desc(submissions.createdAt))
    .limit(60);

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">The Gallery</p>
        <h1 className="section-title">Submissions</h1>
        <p className="lede" style={{ marginBottom: "2.5rem" }}>
          Approved works only. Anything that&apos;s pending lives in the mod queue until a human signs off.
          Want in? <Link href="/submit">Drop a work into the form.</Link>
        </p>

        {approved.length === 0 ? (
          <div className="tile" style={{ minHeight: 0 }}>
            <span className="tile-glyph">◇</span>
            <h3 className="tile-title">The queue is empty.</h3>
            <p className="tile-body">
              Nothing has been approved yet. You could be first. The bar is&nbsp;
              <em>did you make it</em>, not <em>is it good</em>.
            </p>
            <div style={{ marginTop: "1rem" }}>
              <Link href="/submit" className="btn no-underline">Submit a work</Link>
            </div>
          </div>
        ) : (
          <div className="tiles">
            {approved.map((s, i) => (
              <article className="tile" key={s.id}>
                <span className="tile-index">
                  {String(i + 1).padStart(2, "0")} / {String(approved.length).padStart(2, "0")}
                </span>
                <span className="tile-glyph" aria-hidden>◈</span>
                <h3 className="tile-title">{s.title}</h3>
                {s.body && <p className="tile-body">{s.body.slice(0, 240)}</p>}
                <div className="tile-tags">
                  <span>{s.medium}</span>
                  {s.tags?.slice(0, 4).map((t) => <span key={t}>{t}</span>)}
                  {s.nsfw && <span>NSFW</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
