import Link from "next/link";
import BulbMarquee from "@/components/BulbMarquee";
import Tile from "@/components/Tile";
import Glitch from "@/components/Glitch";
import PrizeStamp from "@/components/PrizeStamp";
import PrizeWheel from "@/components/PrizeWheel";
import SeenOn from "@/components/SeenOn";
import Scratch from "@/components/Scratch";
import RevealOnView from "@/components/RevealOnView";

const TOP_MARQUEE = [
  "ROOM IS OCCUPIED",
  "DO NOT ENTER",
  "THE DOOR LOCKED BEHIND YOU",
  "SUBMISSIONS OPEN",
  "FEATS OPEN",
  "WE WERE EXPECTING YOU",
  "NOTHING HERE FOR YOU",
  "EVERYTHING HERE FOR YOU",
  "NO EXITS MARKED",
  "BE WELCOME",
];

const BOTTOM_MARQUEE = [
  "OPERATOR-CULT",
  "INDUSTRIAL",
  "EVIDENCE LOCKER",
  "INTERIOR ROOM",
  "NIGHTMARE / GAME SHOW",
  "HAND-BUILT",
  "EDGE TO EDGE",
  "STAINED CARPET",
  "STILL LIT",
];

export default function Home() {
  return (
    <>
      <BulbMarquee items={TOP_MARQUEE} pattern={["b", "a", "d", "c"]} />

      <section className="hero">
        <span className="huge-digit tl" aria-hidden>04</span>
        <span className="huge-digit br" aria-hidden>00</span>

        <div className="container hero-grid">
          <div>
            <span className="eyebrow slam-in">You Were Not Invited</span>

            <div className="slam-stack" style={{ marginTop: "1rem" }}>
              <span className="line slam slam-in delay-1">
                <Glitch text="DEGENERATE" alts={["DECOMPOSE", "DESECRATE"]} />
              </span>
              <span className="line menace slam-in delay-2">
                <em>&amp; they couldn&apos;t find the rest of him</em>
              </span>
              <span className="line slam slam-in delay-3">
                <span className="skew">FUCKFACE</span>
                <span style={{ color: "var(--text-mid)", fontFamily: "var(--mono)", fontSize: "0.32em", verticalAlign: "super", marginLeft: "0.4em" }}>
                  .com
                </span>
              </span>
              <span className="line blip slam-in delay-4" style={{ marginTop: "0.7rem" }}>
                ▮ no one is coming ▮ the door is locked ▮ welcome inside ▮
              </span>
            </div>

            <p className="lede" style={{ marginTop: "1.8rem", maxWidth: "60ch" }}>
              A multimedia drop-zone, a coding-feats display case, and a Discord-integrated
              cult of weirdos. Hand-built on one Dell R630 in someone&apos;s house. Moderated
              by humans who barely sleep. Consent implied by your continued scrolling.
            </p>

            <div className="hero-meta">
              <span><b>00+</b> submissions live</span>
              <span><b>00</b> feats catalogued</span>
              <span><b>∞</b> appetite for the weird</span>
              <span><b>$0</b> in SaaS bills</span>
              <span><b>1</b> Dell R630</span>
              <span><b>0</b> regrets</span>
            </div>

            <div style={{ marginTop: "2.25rem", display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/submit" className="btn no-underline">Submit a Work</Link>
              <Link href="/discord" className="btn ghost no-underline">Enter the Discord</Link>
              <PrizeStamp tone="banned" rotate="r-n8" style={{ alignSelf: "center" }}>
                Possession Illegal In 14 Nations
              </PrizeStamp>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <PrizeWheel />
            <PrizeStamp tone="red" rotate="r-6" style={{ position: "absolute", top: "-0.5rem", right: "-1rem" }}>
              Found On A Body
            </PrizeStamp>
            <PrizeStamp tone="evidence" rotate="r-n12" style={{ position: "absolute", bottom: "-0.5rem", left: "-1.25rem" }}>
              EVIDENCE · DO NOT REMOVE
            </PrizeStamp>
            <PrizeStamp tone="fuchsia" rotate="r-3" style={{ position: "absolute", top: "44%", right: "-2rem" }}>
              ◇ AS SEEN ◇<br />ON THE INTERNET
            </PrizeStamp>
          </div>
        </div>
      </section>

      <BulbMarquee items={BOTTOM_MARQUEE} pattern={["a", "b", "c", "d"]} />

      <section className="section">
        <div className="container">
          <RevealOnView>
            <span className="eyebrow">Departments</span>
            <h2 className="section-title">
              Four Rooms. <em>One Tent.</em><br />Every Room Cursed.
            </h2>
            <p className="lede" style={{ marginBottom: "2.5rem", color: "var(--text)" }}>
              You don&apos;t need credentials. You don&apos;t need a CV. You need a thing you made
              and the willingness to put it in a queue. A human will see it before the rest of the room does.
              The humans are tired. They will be honest about that.
            </p>
          </RevealOnView>

          <div className="tiles">
            <Tile
              index="01"
              glyph="◈"
              title="Submissions"
              body="Image, audio, video, text, code, link, or some unholy mixture. Drop it in the form. A human (and a Discord bot in a trench coat) sees it before it goes public. The bar is &lsquo;did you make it,&rsquo; not &lsquo;is it good.&rsquo;"
              tags={["any medium", "moderated", "no follower counts"]}
              stamp="OPEN"
              skew="deep-l"
            />
            <Tile
              index="02"
              glyph="⬡"
              title="Coding Feats"
              body="Long-form case studies for the projects you almost can&apos;t believe you finished. Repo, demo, screenshots, post-mortem. The format that lets you brag in detail without anyone calling it cringe."
              tags={["case studies", "post-mortems", "weird hardware OK"]}
              stamp="LISTED"
              skew="r"
            />
            <Tile
              index="03"
              glyph="⬢"
              title="The Discord"
              body="The community spine. Login is Discord login. Mod queue is in Discord. The site pulses with whatever just happened in there. Multimedia explosion, in real time, in role-gated rooms."
              tags={["oauth2", "live activity", "role gated"]}
              stamp="LIVE"
              skew="deep-r"
            />
            <Tile
              index="04"
              glyph="◉"
              title="Infrastructure"
              body="One Dell R630. One Cloudflare Tunnel. Zero cloud bills. Postgres on local disk, Discord bot on systemd, every line of CSS hand-written. Outsourcing is for cowards and shareholders."
              tags={["self-hosted", "ground-up", "no saas"]}
              stamp="OURS"
              skew="l"
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <RevealOnView>
            <span className="eyebrow">As Seen On</span>
            <h2 className="section-title">
              We Have <em>Receipts.</em><br />They Are Not Verified.
            </h2>
            <p className="lede" style={{ marginBottom: "2rem" }}>
              We didn&apos;t ask for these. We can&apos;t source them. They were on the wall when we got here.
            </p>
          </RevealOnView>
          <SeenOn />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <RevealOnView>
            <span className="eyebrow">The House Rules</span>
            <h2 className="section-title">
              If It&apos;s Weird, <em>It&apos;s Probably Welcome.</em><br />Boring Is A Moderation Reason.
            </h2>
            <div className="lede" style={{ display: "grid", gap: "1.25rem", color: "var(--text)" }}>
              <p>
                The internet sorted itself into a feed and called it a culture. We disagree.
                degeneratefuckface.com is a small, deliberate counter-current: submissions live or die on
                whether they&apos;re interesting, not whether they&apos;re engaging. There is no algorithm.
                There is a queue, a person, and a Discord channel that smells like menthol and ozone.
              </p>
              <p>
                We are operator-cult industrial. We like terminal aesthetics, oxblood reds, monospace
                numerals, and projects whose value proposition is the sentence &ldquo;why would you even
                build that.&rdquo; If your thing makes someone slightly uncomfortable in a specific way,
                congratulations, you&apos;re in the right room.
              </p>
              <p>
                Banned at the door: bigotry, doxxing, illegal content, generative slop you didn&apos;t edit,
                CSAM, and anything that wastes a moderator&apos;s time. Past that line: weirder is better.
              </p>
              <p>
                The official position of management on the events of{" "}
                <Scratch cover="REDACTED">that one weekend in the Discord</Scratch>{" "}
                is that{" "}
                <Scratch cover="CLASSIFIED">no one died and the goose did not have a name</Scratch>.
              </p>
            </div>
          </RevealOnView>
        </div>
      </section>

      <section className="section" style={{ borderBottom: "none" }}>
        <div className="container">
          <RevealOnView>
            <span className="eyebrow">Live</span>
            <h2 className="section-title">
              From The Discord <em>Just Now.</em>
            </h2>
            <p className="lede" style={{ marginBottom: "1.5rem" }}>
              Public-channel pulse will land here once the bot is wired. Imagine three weirdos
              arguing about a font and one person posting an unsourced photograph of a dog.
              The dog is fine. The dog is always fine.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link href="/discord" className="btn no-underline">Enter the Discord</Link>
              <Link href="/submissions" className="btn ghost no-underline">See submissions</Link>
            </div>
          </RevealOnView>
        </div>
      </section>
    </>
  );
}
