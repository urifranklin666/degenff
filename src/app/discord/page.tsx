import Link from "next/link";
import Tile from "@/components/Tile";
import PrizeStamp from "@/components/PrizeStamp";
import { fetchWidget } from "@/lib/discord-widget";

export const metadata = { title: "Discord" };
export const dynamic = "force-dynamic";

const CHANNEL_NOTES: Record<string, { title: string; body: string }> = {
  "general": {
    title: "General",
    body: "The room where everyone is. The arguing-about-fonts room. The dog-photo room.",
  },
  "submissions": {
    title: "Submissions",
    body: "Live mirror of approved submissions from the site. Each one appears here when it lands in /submissions/.",
  },
  "showcase": {
    title: "Showcase",
    body: "Approved submissions land here automatically. Mods carry Withdraw and Unfeature buttons on every post.",
  },
  "feats": {
    title: "Feats",
    body: "Long-form coding showcases mirror here when published. Withdraw button on every one.",
  },
  "mod-queue": {
    title: "Mod Queue",
    body: "Mods only. Every submission and feat lands here first with Approve / Feature / Reject buttons.",
  },
  "lobby": {
    title: "Lobby",
    body: "Where first-time arrivals are greeted, slowly, suspiciously.",
  },
};

function noteFor(channelName: string) {
  const key = channelName.toLowerCase().replace(/^#/, "").trim();
  return (
    CHANNEL_NOTES[key] ?? {
      title: `#${channelName}`,
      body: "A room exists for this. We have not written copy about it yet.",
    }
  );
}

export default async function DiscordPage() {
  const widget = await fetchWidget();
  const invite = widget?.instant_invite ?? process.env.DISCORD_INVITE_URL ?? null;
  const total = widget?.members?.length ?? 0;
  const online = widget?.presence_count ?? 0;
  const channels = (widget?.channels ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(0, 12);

  return (
    <>
      <section className="hero" style={{ minHeight: "auto", padding: "clamp(3rem, 7vw, 5rem) 0 0" }}>
        <div className="container" style={{ position: "relative" }}>
          <span className="eyebrow">Doors Open</span>
          <div className="slam-stack">
            <span className="line slam">You Have Been</span>
            <span className="line menace"><em>welcomed inside.</em></span>
            <span className="line blip">★ now keep your hands where we can see them ★</span>
          </div>
          <p className="lede" style={{ marginTop: "1.5rem", maxWidth: "60ch" }}>
            The community spine of degeneratefuckface.com. Site logins are Discord logins. Mod queue is in here.
            Every submission and feat mirrors back into the channels in real time. You sign in once and the rooms
            remember you.
          </p>

          <div className="discord-stats">
            <div className="stat">
              <span className="num">{widget?.name ?? "—"}</span>
              <span className="label">Guild</span>
            </div>
            <div className="stat">
              <span className="num">{online > 0 ? online : "—"}</span>
              <span className="label">Online now</span>
            </div>
            <div className="stat">
              <span className="num">{total > 0 ? `${total}+` : "—"}</span>
              <span className="label">Visible members</span>
            </div>
            <div className="stat">
              <span className="num">{channels.length || "—"}</span>
              <span className="label">Public rooms</span>
            </div>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
            {invite ? (
              <a href={invite} target="_blank" rel="noopener noreferrer" className="btn no-underline">
                Enter the Discord
              </a>
            ) : (
              <span className="btn" style={{ opacity: 0.55, pointerEvents: "none" }}>
                Invite link pending
              </span>
            )}
            <Link href="/submit" className="btn ghost no-underline">Submit a work</Link>
            <PrizeStamp tone="banned" rotate="r-n8">No phones in the chapel</PrizeStamp>
          </div>

          {!widget && (
            <p className="lede" style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--text-mid)" }}>
              <em>Widget unavailable</em> — the server admin hasn&apos;t enabled the Discord widget yet (or it just
              rate-limited us). The button above falls back to <code>DISCORD_INVITE_URL</code> from the server
              env once set. Stats will populate once the widget toggles on.
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">Rooms On The Other Side</span>
          <h2 className="section-title">
            What You&apos;ll Find <em>In There.</em>
          </h2>
          <p className="lede" style={{ marginBottom: "2rem" }}>
            The bot and the site read from the same Discord. Roles you have in the server map to roles on the site.
            If you can see a channel here, you can act on its content from the site too — and vice versa.
          </p>

          {channels.length > 0 ? (
            <div className="tiles">
              {channels.map((c, i) => {
                const note = noteFor(c.name);
                return (
                  <Tile
                    key={c.id}
                    index={String(i + 1).padStart(2, "0")}
                    glyph={c.name === "mod-queue" ? "◆" : "⬡"}
                    title={`#${c.name}`}
                    body={note.body}
                    skew={i % 4 === 0 ? "deep-l" : i % 3 === 0 ? "r" : i % 2 === 0 ? "l" : "deep-r"}
                  />
                );
              })}
            </div>
          ) : (
            <div className="tile" style={{ minHeight: 0 }}>
              <span className="tile-glyph">⬢</span>
              <h3 className="tile-title">Channel list shows up once the widget is on.</h3>
              <p className="tile-body">
                We render channels live from Discord, not from a hardcoded list — that way new rooms appear here
                the moment you create them on the server.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ borderBottom: "none" }}>
        <div className="container" style={{ maxWidth: "72ch" }}>
          <span className="eyebrow">The Pact</span>
          <h2 className="section-title">
            One Account. <em>Two Rooms.</em>
          </h2>
          <div className="lede" style={{ display: "grid", gap: "1.1rem" }}>
            <p>
              When you sign in on the site, we use your Discord identity. Your username, your avatar, your guild
              roles. We don&apos;t store a password — there isn&apos;t one to leak.
            </p>
            <p>
              If the server gives you the <b>Mod</b> role, the site lets you into <code>/mod</code> and the
              moderation buttons in <code>#mod-queue</code> respect your clicks. Lose the role, lose access — at
              next sign-in. There&apos;s no second source of truth.
            </p>
            <p>
              The site is the showroom; the Discord is the workshop. The workshop is louder, dirtier, and where
              real decisions get made. Behave like a person and we&apos;ll let you stay.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
