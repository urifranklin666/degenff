import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getContributorByHandle, getContributorWork } from "@/lib/contrib";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params) {
  const { handle } = await params;
  return {
    title: `@${handle}`,
    description: `Approved submissions and feats from @${handle} on degeneratefuckface.com`,
  };
}

function dateOnly(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default async function ContributorPage({ params }: Params) {
  const { handle } = await params;
  if (!/^[a-z0-9_.-]{1,64}$/i.test(handle)) notFound();

  const profile = await getContributorByHandle(handle);
  if (!profile) notFound();

  const { subs, feats } = await getContributorWork(profile.id);

  return (
    <section className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container">
        <p className="eyebrow">{"// dossier · subject"}</p>
        <div className="contrib-head">
          {profile.image ? (
            <Image src={profile.image} alt="" width={88} height={88} className="contrib-avatar" unoptimized />
          ) : (
            <div className="contrib-avatar contrib-avatar-empty" aria-hidden>?</div>
          )}
          <div>
            <h1 className="section-title" style={{ marginBottom: "0.4rem" }}>
              @{profile.handle}
              {profile.banned && <span className="ops-tag banned" style={{ marginLeft: "0.6rem", fontSize: "0.5em", verticalAlign: "middle" }}>BANNED</span>}
            </h1>
            <p className="contrib-meta">
              <span className={`ops-role-pill role-${profile.role}`}>{profile.role}</span>
              <span>seen first · {dateOnly(profile.joinedAt)}</span>
              <span>{subs.length} submission{subs.length === 1 ? "" : "s"} · {feats.length} feat{feats.length === 1 ? "" : "s"}</span>
            </p>
          </div>
        </div>

        {feats.length > 0 && (
          <div className="contrib-section">
            <h2 className="contrib-h">{"// feats"}</h2>
            <ul className="contrib-feats">
              {feats.map((f) => (
                <li key={f.slug}>
                  <Link href={`/feats/${f.slug}`} className="contrib-feat-link">
                    <span className="contrib-feat-title">⬢ {f.title}</span>
                    {f.summary && <span className="contrib-feat-sum">{f.summary}</span>}
                    <span className="contrib-feat-date">{dateOnly(f.publishedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {subs.length > 0 ? (
          <div className="contrib-section">
            <h2 className="contrib-h">{"// submissions"}</h2>
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
                      <span>{s.medium}</span>
                      {s.featured && <span className="contrib-tile-feat">FEATURED</span>}
                      {s.nsfw && <span className="contrib-tile-nsfw">NSFW</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : feats.length === 0 ? (
          <p className="contrib-empty">No public record. Probably watching from the back.</p>
        ) : null}
      </div>
    </section>
  );
}
