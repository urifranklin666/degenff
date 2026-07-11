import Link from "next/link";
import { auth } from "@/auth";
import { recentClaims } from "@/lib/midway";
import MidwayClient from "./MidwayClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Midway",
  description:
    "Daily prize wheel, scratch cards, and the tooth jar. Every prize is worthless, permanent, and public.",
};

const SOURCE_GLYPH: Record<string, string> = {
  "midway-wheel": "◆",
  "midway-scratch": "▚",
  "midway-tooth": "𐤟",
  barker: "◈",
  seance: "◍",
  bureau: "▤",
};

export default async function MidwayPage() {
  const [session, claims] = await Promise.all([auth(), recentClaims(18)]);
  const signedIn = !!session?.user?.id;

  return (
    <section className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container">
        <p className="eyebrow">{"// games of chance · no refunds"}</p>
        <h1 className="section-title">
          The <em>Midway.</em>
        </h1>
        <p className="lede" style={{ marginBottom: "1rem", color: "var(--text)" }}>
          Three attractions. One spin, one pull, three cards a day. Every prize is worthless,
          permanent, and stamped onto your <Link href="/me">public record</Link>. The house
          always wins, but so do you, in a way the house finds funnier.
        </p>
        {!signedIn && (
          <p className="midway-signin">
            <Link href="/gate?next=/midway" className="btn no-underline">
              Sign in to play
            </Link>
            <span>— the house needs a name for the paperwork.</span>
          </p>
        )}

        <MidwayClient signedIn={signedIn} />

        <div className="midway-ledger">
          <h2 className="contrib-h">{"// claims ledger — recent payouts"}</h2>
          {claims.length === 0 ? (
            <p className="contrib-empty">No claims yet. The prizes are getting restless.</p>
          ) : (
            <ul className="midway-ledger-list">
              {claims.map((c, i) => (
                <li key={i}>
                  <span className="midway-ledger-glyph" aria-hidden>
                    {SOURCE_GLYPH[c.source] ?? "◇"}
                  </span>
                  <Link href={`/u/${c.handle}`} className="no-underline">@{c.handle}</Link>
                  <span className="midway-ledger-took">claimed</span>
                  <b>{c.label}</b>
                  <span className="midway-ledger-date">{c.createdAt.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
