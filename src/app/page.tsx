import Marquee from "@/components/Marquee";
import Tile from "@/components/Tile";
import Link from "next/link";

const MARQUEE = [
  "Artist Submissions",
  "Coding Feats",
  "Live Discord",
  "Multimedia Drops",
  "Operator-Cult",
  "Industrial Web",
  "Self-Hosted",
  "Edge to Edge",
  "Cathedral of Bad Ideas",
  "Public Misbehavior",
  "Hand-Built",
  "Not For Everyone",
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="reveal">
            <p className="eyebrow">Media · Submissions · Discord</p>
            <h1 className="hero-headline">
              <span>A Cathedral</span>
              <span className="crimson">For Bad</span>
              <span><span className="scratch">Ideas.</span></span>
            </h1>
            <p className="lede" style={{ marginTop: "2rem" }}>
              degeneratefuckface.com is a multimedia drop-zone, a coding-feats display case, and a Discord-integrated cult of weirdos.
              Hand-built on a Dell R630 in someone&apos;s house. Moderated by humans. Not affiliated with anything that wants you well-adjusted.
            </p>
            <div className="hero-meta">
              <span><b>00+</b> submissions live</span>
              <span><b>00</b> feats catalogued</span>
              <span><b>∞</b> appetite for the weird</span>
              <span><b>$0</b> in SaaS</span>
            </div>
            <div style={{ marginTop: "2.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link href="/submit" className="btn no-underline">Submit a work</Link>
              <Link href="/discord" className="btn ghost no-underline">Enter the Discord</Link>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={MARQUEE} />

      <section className="section">
        <div className="container">
          <p className="eyebrow">What This Place Is</p>
          <h2 className="section-title">The Whole Thing,<br />Not A Brand Deck About It.</h2>
          <p className="lede" style={{ marginBottom: "3rem" }}>
            Four overlapping departments. You don&apos;t need credentials. You don&apos;t need a CV.
            You need a thing you made and the willingness to put it in a queue.
          </p>
          <div className="tiles">
            <Tile
              index="01 / 04"
              glyph="◈"
              title="Submissions"
              body="Image, audio, video, text, code, or link. Whatever you made. Drop it in the form. A human (and a Discord bot in a trench coat) sees it before it goes public."
              tags={["any medium", "moderated", "no follower counts"]}
            />
            <Tile
              index="02 / 04"
              glyph="⬡"
              title="Coding Feats"
              body="Long-form showcases for the things you almost can&apos;t believe you finished. Repo, demo, screenshots, a story. The case-study format for projects that deserve more than a tweet."
              tags={["case studies", "post-mortems", "weird hardware OK"]}
            />
            <Tile
              index="03 / 04"
              glyph="⬢"
              title="The Discord"
              body="The community spine. Site logins are Discord logins. Mod queue is in Discord. The site pulses with whatever just happened in there. Multimedia explosion, in real time."
              tags={["oauth2", "live activity", "role gated"]}
            />
            <Tile
              index="04 / 04"
              glyph="◉"
              title="Infrastructure"
              body="One Dell R630. One Cloudflare Tunnel. Zero cloud bills. Postgres on local disk. Discord bot on systemd. Coded ground-up because outsourcing is for cowards and shareholders."
              tags={["self-hosted", "ground-up", "no saas"]}
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="eyebrow">Manifesto</p>
          <h2 className="section-title">
            If It&apos;s Weird,<br />It&apos;s Probably Welcome.
          </h2>
          <div className="lede" style={{ display: "grid", gap: "1.25rem" }}>
            <p>
              The internet sorted itself into a feed and called it a culture. We disagree.
              degeneratefuckface.com is a small, deliberate counter-current: submissions live or die on whether they&apos;re interesting,
              not whether they&apos;re engaging. There is no algorithm. There is a queue and a person and a Discord channel.
            </p>
            <p>
              We are operator-cult industrial. We like terminal aesthetics, oxblood reds, monospace numerals, and projects whose value
              proposition is the sentence &ldquo;why would you even build that.&rdquo; If your thing makes someone slightly uncomfortable
              in a specific way, congratulations, you&apos;re in the right room.
            </p>
            <p>
              Submissions are moderated. Bigotry is not a flavor we serve. Beyond that, weirder is generally better.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ borderBottom: "none" }}>
        <div className="container">
          <p className="eyebrow">Live</p>
          <h2 className="section-title">From The Discord<br />Just Now.</h2>
          <p className="lede">
            Activity feed from the public channels lands here once the bot is wired. For now: imagine three weirdos arguing about a font.
          </p>
          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/discord" className="btn no-underline">Enter the Discord</Link>
            <Link href="/submissions" className="btn ghost no-underline">See submissions</Link>
          </div>
        </div>
      </section>
    </>
  );
}
