import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getContributorByHandle, getContributorWork } from "@/lib/contrib";
import { awardsForUser } from "@/lib/awards";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params) {
  const { handle } = await params;
  return {
    title: `@${handle}`,
    description: `Feats, titles, and stamps on file for @${handle} at degeneratefuckface.com`,
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

  const [{ feats }, awards] = await Promise.all([
    getContributorWork(profile.id),
    awardsForUser(profile.id),
  ]);
  const titles = awards.filter((a) => a.kind === "title");
  const stamps = awards.filter((a) => a.kind === "stamp");

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
              {titles[0] && <span className="contrib-title-held">◈ {titles[0].label}</span>}
              <span>seen first · {dateOnly(profile.joinedAt)}</span>
              <span>{feats.length} feat{feats.length === 1 ? "" : "s"} · {stamps.length} stamp{stamps.length === 1 ? "" : "s"}</span>
            </p>
          </div>
        </div>

        {awards.length > 0 && (
          <div className="contrib-section">
            <h2 className="contrib-h">{"// decorations"}</h2>
            <ul className="contrib-awards">
              {awards.map((a) => (
                <li key={a.id} className={`contrib-award is-${a.kind}`}>
                  <span className="contrib-award-label">{a.kind === "title" ? "◈" : "◆"} {a.label}</span>
                  {a.flavor && <span className="contrib-award-flavor">{a.flavor}</span>}
                  <span className="contrib-award-date">{a.createdAt.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {feats.length > 0 ? (
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
        ) : awards.length === 0 ? (
          <p className="contrib-empty">No public record. Probably watching from the back.</p>
        ) : null}
      </div>
    </section>
  );
}
