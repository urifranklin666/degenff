import Link from "next/link";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const metadata = { title: "Submissions" };
export const dynamic = "force-dynamic";

const MEDIUM_GLYPH: Record<string, string> = {
  image: "◈",
  audio: "◐",
  video: "▶",
  text: "✎",
  code: "⌬",
  link: "↗",
  mixed: "✻",
};

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
            {approved.map((s, i) => {
              const firstImage = (s.files ?? []).find((f) => f.mime.startsWith("image/"));
              const firstVideo = (s.files ?? []).find((f) => f.mime.startsWith("video/"));
              const thumb = firstImage ?? firstVideo;
              const skews = ["skew-l", "skew-r", "skew-deep-l", "skew-deep-r"] as const;
              return (
                <Link
                  href={`/submissions/${s.id}`}
                  key={s.id}
                  className={`tile gallery-tile no-underline ${skews[i % skews.length]} ${s.nsfw ? "is-nsfw" : ""}`}
                  data-stamp={s.featured ? "FEATURED" : ""}
                >
                  {thumb ? (
                    <div className="tile-thumb">
                      {thumb.mime.startsWith("image/") ? (
                        <img src={`/uploads/${thumb.path}`} alt="" loading="lazy" />
                      ) : (
                        <video src={`/uploads/${thumb.path}`} muted playsInline preload="metadata" />
                      )}
                      {s.nsfw && <span className="nsfw-veil">NSFW · hover</span>}
                    </div>
                  ) : (
                    <div className="tile-thumb tile-thumb-empty">
                      <span aria-hidden>{MEDIUM_GLYPH[s.medium] ?? "◇"}</span>
                    </div>
                  )}
                  <span className="tile-index">
                    {String(i + 1).padStart(2, "0")} / {String(approved.length).padStart(2, "0")}
                  </span>
                  <h3 className="tile-title">{s.title}</h3>
                  {s.body && <p className="tile-body">{s.body.slice(0, 180)}</p>}
                  <div className="tile-tags">
                    <span>{s.medium}</span>
                    {s.tags?.slice(0, 3).map((t) => <span key={t}>{t}</span>)}
                    {s.nsfw && <span>NSFW</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
