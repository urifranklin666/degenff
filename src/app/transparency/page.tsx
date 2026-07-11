import Link from "next/link";
import { getWeeklyStats } from "@/lib/transparency";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Transparency",
  description: "Public, redacted weekly stats from the moderation desk.",
};

function dateRange(start: string, end: string): string {
  return `${start.slice(0, 10)} → ${end.slice(0, 10)}`;
}

export default async function TransparencyPage() {
  const s = await getWeeklyStats();
  const totalActions = s.approve + s.feature + s.reject + s.withdraw + s.unfeature;

  return (
    <section className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container" style={{ maxWidth: "880px" }}>
        <p className="eyebrow">{"// public record · last 7 days"}</p>
        <h1 className="section-title">
          The <em>Desk.</em>
        </h1>
        <p className="lede" style={{ marginBottom: "2rem", color: "var(--text)" }}>
          What the moderators did this week, redacted to counts. The desk keeps
          receipts on itself — that&apos;s the whole point.
        </p>

        <div className="transparency-card">
          <div className="transparency-window">{dateRange(s.windowStart, s.windowEnd)}</div>

          <div className="transparency-grid">
            <div className="transparency-stat"><span className="v">{s.approve}</span><span className="l">approved</span></div>
            <div className="transparency-stat feature"><span className="v">{s.feature}</span><span className="l">featured</span></div>
            <div className="transparency-stat reject"><span className="v">{s.reject}</span><span className="l">rejected</span></div>
            <div className="transparency-stat withdraw"><span className="v">{s.withdraw}</span><span className="l">withdrawn</span></div>
            <div className="transparency-stat"><span className="v">{s.unfeature}</span><span className="l">unfeatured</span></div>
            <div className="transparency-stat total"><span className="v">{totalActions}</span><span className="l">total actions</span></div>
          </div>
        </div>

        {s.topContributors.length > 0 && (
          <div className="transparency-card">
            <h2 className="transparency-h">{"// who showed up"}</h2>
            <ul className="transparency-list">
              {s.topContributors.map((c) => (
                <li key={c.handle}>
                  <span className="transparency-n">{c.n}×</span>
                  <Link href={`/u/${c.handle}`} className="transparency-handle">@{c.handle}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p style={{ marginTop: "2rem", color: "var(--text-dim-aa)", fontFamily: "var(--mono)", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          {"// refreshed on every page load · no caching · the desk is honest"}
        </p>
      </div>
    </section>
  );
}
