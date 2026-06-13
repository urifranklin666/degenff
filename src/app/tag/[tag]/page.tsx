import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  isValidTag,
  normalizeTag,
  submissionsByTag,
  featsByTag,
} from "@/lib/browse";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ tag: string }> };

export async function generateMetadata({ params }: Params) {
  const { tag } = await params;
  return {
    title: `#${tag}`,
    description: `Approved submissions and feats tagged "${tag}" on degeneratefuckface.com`,
  };
}

export default async function TagPage({ params }: Params) {
  const { tag: rawTag } = await params;
  const tag = normalizeTag(decodeURIComponent(rawTag));
  if (!isValidTag(tag)) notFound();

  const [subs, feats] = await Promise.all([
    submissionsByTag(tag),
    featsByTag(tag),
  ]);

  if (subs.length === 0 && feats.length === 0) {
    return (
      <section className="section" style={{ paddingTop: "2.5rem" }}>
        <div className="container">
          <p className="eyebrow">{"// catalogue"}</p>
          <h1 className="section-title">#{tag}</h1>
          <p className="contrib-empty">Nothing tagged with that. Yet.</p>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/submissions" className="btn ghost no-underline">All submissions</Link>
          </p>
        </div>
      </section>
    );
  }

  // specimen-label metadata, computed from what we already fetched
  const tally = new Map<string, number>();
  for (const item of [...subs, ...feats]) {
    for (const t of item.tags) {
      if (t !== tag) tally.set(t, (tally.get(t) ?? 0) + 1);
    }
  }
  const related = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const handles = new Map<string, number>();
  for (const item of [...subs, ...feats]) {
    if (item.authorHandle) handles.set(item.authorHandle, (handles.get(item.authorHandle) ?? 0) + 1);
  }
  const topHandle = [...handles.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const dates = [...subs.map((s) => s.decidedAt), ...feats.map((f) => f.publishedAt)]
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
            <span><b>{String(subs.length).padStart(2, "0")}</b> submissions</span>
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

        {feats.length > 0 && (
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
        )}

        {subs.length > 0 && (
          <div className="contrib-section">
            <h2 className="contrib-h">{`// submissions (${subs.length})`}</h2>
            <ul className="contrib-grid">
              {subs.map((s) => (
                <li key={s.id} className={`contrib-tile${s.featured ? " is-featured" : ""}`}>
                  <Link href={`/submissions/${s.id}`} className="contrib-tile-link">
                    {s.thumbPath ? (
                      <Image
                        src={`/uploads/${s.thumbPath}`}
                        alt=""
                        width={240}
                        height={180}
                        className="contrib-tile-thumb"
                        unoptimized
                      />
                    ) : (
                      <div className="contrib-tile-thumb contrib-tile-thumb-empty" aria-hidden>
                        {s.medium[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="contrib-tile-title">{s.title}</span>
                    <span className="contrib-tile-meta">
                      {s.authorHandle && <span>@{s.authorHandle}</span>}
                      {s.featured && <span className="contrib-tile-feat">FEATURED</span>}
                      {s.nsfw && <span className="contrib-tile-nsfw">NSFW</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
