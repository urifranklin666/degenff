import { db } from "@/db";
import { feats, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import PrizeStamp from "@/components/PrizeStamp";

export const metadata = {
  title: "Feats",
  description:
    "The display case. Long-form case studies for projects that actually finished.",
};
export const dynamic = "force-dynamic";

function dateOnly(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "undated";
}

export default async function FeatsPage() {
  const published = await db
    .select({
      id: feats.id,
      slug: feats.slug,
      title: feats.title,
      summary: feats.summary,
      heroImagePath: feats.heroImagePath,
      repoUrl: feats.repoUrl,
      demoUrl: feats.demoUrl,
      tags: feats.tags,
      publishedAt: feats.publishedAt,
      authorHandle: users.handle,
    })
    .from(feats)
    .leftJoin(users, eq(feats.userId, users.id))
    .where(eq(feats.status, "approved"))
    .orderBy(desc(feats.publishedAt))
    .limit(40);

  const [lead, ...rest] = published;

  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">{"// the display case"}</p>
        <h1 className="section-title">
          Feats Of <em>Engineering.</em>
          <br />
          Witnessed. Catalogued. Regretted.
        </h1>
        <p className="lede" style={{ maxWidth: "62ch", marginBottom: "1.25rem" }}>
          The case-study format for projects that finished. Repos, demos,
          post-mortems. Weird hardware especially welcome. Each one is pinned
          behind glass with the holes still in it.
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "3rem",
          }}
        >
          <Link href="/feats/new" className="btn no-underline">
            Submit A Feat
          </Link>
          <span className="dossier-meta">
            <b>⬢ {String(published.length).padStart(2, "0")}</b>
            <span className="sep">·</span> specimens on display
          </span>
        </div>

        {published.length === 0 ? (
          <div className="tile" style={{ minHeight: 0 }}>
            <span className="tile-glyph">⬡</span>
            <h3 className="tile-title">Nothing catalogued yet.</h3>
            <p className="tile-body">
              The first published feat will live here. Then more. The case is
              dusted weekly regardless.
            </p>
          </div>
        ) : (
          <>
            <article className="feat-lead">
              <PrizeStamp tone="gold" rotate="r-n8" className="feat-lead-stamp">
                Exhibit A
              </PrizeStamp>
              {lead.heroImagePath ? (
                <Link
                  href={`/feats/${lead.slug}`}
                  className="feat-lead-visual no-underline"
                  aria-hidden
                  tabIndex={-1}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/uploads/${lead.heroImagePath}`} alt="" loading="lazy" />
                </Link>
              ) : (
                <Link
                  href={`/feats/${lead.slug}`}
                  className="feat-lead-visual feat-lead-visual-empty no-underline"
                  aria-hidden
                  tabIndex={-1}
                >
                  ⬢
                </Link>
              )}
              <div className="feat-lead-body">
                <span className="feat-case-meta">
                  {`№ 01 · filed ${dateOnly(lead.publishedAt)}`}
                  {lead.authorHandle ? ` · @${lead.authorHandle}` : ""}
                </span>
                <h2 className="feat-lead-title">
                  <Link href={`/feats/${lead.slug}`} className="no-underline">
                    {lead.title}
                  </Link>
                </h2>
                {lead.summary && <p className="feat-lead-sum">{lead.summary}</p>}
                <div className="feat-case-links">
                  {lead.repoUrl && (
                    <a href={lead.repoUrl} rel="noopener nofollow" target="_blank">
                      repo ↗
                    </a>
                  )}
                  {lead.demoUrl && (
                    <a href={lead.demoUrl} rel="noopener nofollow" target="_blank">
                      demo ↗
                    </a>
                  )}
                  <Link href={`/feats/${lead.slug}`}>read the file →</Link>
                </div>
                {lead.tags && lead.tags.length > 0 && (
                  <div className="tile-tags">
                    {lead.tags.slice(0, 6).map((t) => (
                      <Link key={t} href={`/tag/${encodeURIComponent(t)}`} className="no-underline">
                        {t}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </article>

            {rest.length > 0 && (
              <ol className="feat-case-list">
                {rest.map((f, i) => (
                  <li key={f.id} className="feat-case">
                    <span className="feat-case-index" aria-hidden>
                      {String(i + 2).padStart(2, "0")}
                    </span>
                    {f.heroImagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/uploads/${f.heroImagePath}`}
                        alt=""
                        className="feat-case-thumb"
                        loading="lazy"
                      />
                    ) : (
                      <div className="feat-case-thumb feat-case-thumb-empty" aria-hidden>
                        ⬢
                      </div>
                    )}
                    <div className="feat-case-body">
                      <h3 className="feat-case-title">
                        <Link href={`/feats/${f.slug}`} className="no-underline">
                          {f.title}
                        </Link>
                      </h3>
                      {f.summary && <p className="feat-case-sum">{f.summary}</p>}
                      <span className="feat-case-meta">
                        {`filed ${dateOnly(f.publishedAt)}`}
                        {f.authorHandle ? ` · @${f.authorHandle}` : ""}
                        {f.repoUrl ? " · repo" : ""}
                        {f.demoUrl ? " · demo" : ""}
                      </span>
                    </div>
                    {f.tags && f.tags.length > 0 && (
                      <div className="tile-tags feat-case-tags">
                        {f.tags.slice(0, 3).map((t) => (
                          <Link
                            key={t}
                            href={`/tag/${encodeURIComponent(t)}`}
                            className="no-underline"
                          >
                            {t}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </section>
  );
}
