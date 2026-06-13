import Link from "next/link";
import Image from "next/image";
import { featuredSubmissions } from "@/lib/browse";
import PrizeStamp from "@/components/PrizeStamp";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Featured",
  description: "Curated submissions the moderators bumped to the front.",
};

export default async function FeaturedPage() {
  const items = await featuredSubmissions(60);

  return (
    <section className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container">
        <p className="eyebrow">{"// curator's wall"}</p>
        <h1 className="section-title">
          The <em>Bumped.</em>
        </h1>
        <p className="lede" style={{ maxWidth: "60ch", marginBottom: "1.25rem" }}>
          Submissions a moderator went out of their way to push to the front of the room.
          Make of that what you will. We make of it that someone, at minimum, paused.
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "2.5rem",
          }}
        >
          <span className="dossier-meta">
            <b>◈ {String(items.length).padStart(2, "0")}</b>
            <span className="sep">·</span> hand-picked, no algorithm consulted
          </span>
          <PrizeStamp tone="gold" rotate="r-3">
            Curator Approved
          </PrizeStamp>
        </div>

        {items.length === 0 ? (
          <p className="contrib-empty">Nothing pinned yet. Patience.</p>
        ) : (
          <ul className="contrib-grid">
            {items.map((s) => (
              <li key={s.id} className="contrib-tile is-featured">
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
                    <span className="contrib-tile-feat">
                      {s.decidedAt ? `BUMPED ${s.decidedAt.slice(0, 10)}` : "FEATURED"}
                    </span>
                    {s.nsfw && <span className="contrib-tile-nsfw">NSFW</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
