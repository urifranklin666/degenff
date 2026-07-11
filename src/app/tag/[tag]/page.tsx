import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidTag, normalizeTag, featsByTag } from "@/lib/browse";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ tag: string }> };

export async function generateMetadata({ params }: Params) {
  const { tag } = await params;
  return {
    title: `#${tag}`,
    description: `Feats tagged "${tag}" on degeneratefuckface.com`,
  };
}

export default async function TagPage({ params }: Params) {
  const { tag: rawTag } = await params;
  const tag = normalizeTag(decodeURIComponent(rawTag));
  if (!isValidTag(tag)) notFound();

  const feats = await featsByTag(tag);

  if (feats.length === 0) {
    return (
      <section className="section" style={{ paddingTop: "2.5rem" }}>
        <div className="container">
          <p className="eyebrow">{"// catalogue"}</p>
          <h1 className="section-title">#{tag}</h1>
          <p className="contrib-empty">Nothing tagged with that. Yet.</p>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/feats" className="btn ghost no-underline">All feats</Link>
          </p>
        </div>
      </section>
    );
  }

  // specimen-label metadata, computed from what we already fetched
  const tally = new Map<string, number>();
  for (const item of feats) {
    for (const t of item.tags) {
      if (t !== tag) tally.set(t, (tally.get(t) ?? 0) + 1);
    }
  }
  const related = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const handles = new Map<string, number>();
  for (const item of feats) {
    if (item.authorHandle) handles.set(item.authorHandle, (handles.get(item.authorHandle) ?? 0) + 1);
  }
  const topHandle = [...handles.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const dates = feats.map((f) => f.publishedAt)
    .filter((d): d is string => d !== null)
    .sort();
  const firstSeen = dates[0]?.slice(0, 10) ?? null;

  return (
    <section className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container">
        <p className="eyebrow">{"// specimen label"}</p>
        <h1 className="section-title">
          <em>#</em>{tag}
        </h1>

        <div className="tag-card">
          <div className="tag-card-stats">
            <span><b>{String(feats.length).padStart(2, "0")}</b> feats</span>
            {firstSeen && <span>first sighted <b>{firstSeen}</b></span>}
            {topHandle && (
              <span>
                chief offender{" "}
                <Link href={`/u/${topHandle[0]}`} className="no-underline">
                  <b>@{topHandle[0]}</b>
                </Link>{" "}
                ×{topHandle[1]}
              </span>
            )}
          </div>
          {related.length > 0 && (
            <div className="tag-card-related">
              <span className="l">found near:</span>
              {related.map(([t, n]) => (
                <Link key={t} href={`/tag/${encodeURIComponent(t)}`} className="no-underline">
                  #{t}
                  <i>×{n}</i>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="contrib-section">
          <h2 className="contrib-h">{`// feats (${feats.length})`}</h2>
          <ul className="contrib-feats">
            {feats.map((f) => (
              <li key={f.slug}>
                <Link href={`/feats/${f.slug}`} className="contrib-feat-link">
                  <span className="contrib-feat-title">⬢ {f.title}</span>
                  {f.summary && <span className="contrib-feat-sum">{f.summary}</span>}
                  <span className="contrib-feat-date">
                    {f.authorHandle ? `@${f.authorHandle}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
