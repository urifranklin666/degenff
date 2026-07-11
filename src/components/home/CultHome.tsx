import Link from "next/link";
import BulbMarquee from "@/components/BulbMarquee";
import Tile from "@/components/Tile";
import Glitch from "@/components/Glitch";
import PrizeStamp from "@/components/PrizeStamp";
import PrizeWheel from "@/components/PrizeWheel";
import SeenOn from "@/components/SeenOn";
import Scratch from "@/components/Scratch";
import RevealOnView from "@/components/RevealOnView";
import KineticType from "@/components/KineticType";
import DiscordTicker from "@/components/DiscordTicker";
import OracleDrop from "@/components/OracleDrop";
import { getSiteStats, padCount } from "@/lib/stats";

const TOP_MARQUEE = [
  "ROOM IS OCCUPIED",
  "DO NOT ENTER",
  "THE DOOR LOCKED BEHIND YOU",
  "THE MIDWAY IS OPEN",
  "THE SPIRIT IS IN",
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

export default async function CultHome() {
  const stats = await getSiteStats();
  return (
    <>
      <BulbMarquee items={TOP_MARQUEE} pattern={["b", "a", "d", "c"]} />

      <section className="hero">
        <span className="huge-digit tl" aria-hidden>04</span>
        <span className="huge-digit br" aria-hidden>00</span>

        <div className="container hero-grid">
          <div>
            <span className="eyebrow slam-in">You Were Not Invited</span>

            <div className="slam-stack glitch-react" style={{ marginTop: "1rem" }}>
              <span className="line slam slam-in delay-1">
                <Glitch text="DEGENERATE" alts={["DECOMPOSE", "DESECRATE"]} />
              </span>
              <span className="line menace slam-in delay-2">
                <em>we kept the receipts but lost the body</em>
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
              A haunted carnival with a resident barker: chat rooms, a séance board, a midway
              of cursed prizes, a radio tower, and a bureau that files you. Hand-built on one
              Dell R630 in someone&apos;s house. Consent implied by your continued scrolling.
            </p>

            <div className="hero-meta">
              <span><b>{stats ? padCount(stats.roomMessages) : "00+"}</b> things said in the rooms</span>
              <span><b>{stats ? padCount(stats.feats) : "00"}</b> feats catalogued</span>
              <span><b>{stats ? padCount(stats.awards) : "00"}</b> worthless prizes claimed</span>
              <span><b>{stats ? padCount(stats.residents) : "00"}</b> weirdos on record</span>
              <span><b>∞</b> appetite for the weird</span>
              <span><b>$0</b> in SaaS bills</span>
              <span><b>1</b> Dell R630</span>
              <span><b>0</b> regrets</span>
            </div>

            <div style={{ marginTop: "2.25rem", display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/midway" className="btn no-underline">Play the Midway</Link>
              <Link href="/dead" className="btn ghost no-underline">Degeneracy is dead †</Link>
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
              You don&apos;t need credentials. You don&apos;t need a CV. You need to sign the register
              and walk the floor. Something that lives here will notice you. It is friendly,
              in the way a carnival is friendly. It will be honest about that.
            </p>
          </RevealOnView>

          <div className="tiles">
            <Tile
              index="01"
              glyph="◈"
              title="The Midway"
              body="The prize wheel spins once a day per soul. Scratch cards scratch. The tooth jar pays out in teeth. Every prize is worthless, permanent, and stamped onto your public record. Play compulsively."
              tags={["daily spin", "cursed prizes", "stamps on file"]}
              stamp="OPEN"
              skew="deep-l"
            />
            <Tile
              index="02"
              glyph="◍"
              title="The Séance"
              body="A ouija board with something actually on the other end. The room spells a question one letter per minute, one hand each. When the sentence locks, the planchette moves on its own. Watch it answer live."
              tags={["one letter per minute", "collective typing", "it answers"]}
              stamp="LIVE"
              skew="r"
            />
            <Tile
              index="03"
              glyph="⬢"
              title="The Rooms"
              body="The Discord died — dependency, tragic, notice at the door. So the tent grew its own chat on our own Postgres. The Barker lives in the walls now. Nobody can evict it again."
              tags={["self-hosted chat", "resident barker", "never again"]}
              stamp="OURS"
              skew="deep-r"
            />
            <Tile
              index="04"
              glyph="◉"
              title="Radio Degeneracy"
              body="A transmitter bolted to the R630. Music around the clock, station idents by a voice that has never had a body, occasional readings from the rooms. Leave it on in a tab. It likes that."
              tags={["24/7 stream", "dj: the barker", "zero cloud bills"]}
              stamp="ON AIR"
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
                degeneratefuckface.com is a small, deliberate counter-current: an attraction, not a
                platform. There is no algorithm. There is a wheel, a board, a bureau, and a barker
                in a tent that smells like menthol and ozone.
              </p>
              <p>
                We are operator-cult industrial. We like terminal aesthetics, oxblood reds, monospace
                numerals, and projects whose value proposition is the sentence &ldquo;why would you even
                build that.&rdquo; If your thing makes someone slightly uncomfortable in a specific way,
                congratulations, you&apos;re in the right room.
              </p>
              <p>
                Banned at the door: bigotry, doxxing, illegal content, and anything that wastes the
                clerk&apos;s time. Past that line: weirder is better.
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

      <section className="section" style={{ paddingTop: "0", paddingBottom: "2rem", borderBottom: "none" }}>
        <div className="container">
          <OracleDrop />
        </div>
      </section>

      <section className="section" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div className="container">
          <RevealOnView>
            <span className="eyebrow">Last Transmissions</span>
            <h2 className="section-title">
              <KineticType text="FROM THE DISCORD" />{" "}
              <em>Posthumously.</em>
            </h2>
            <p className="lede" style={{ marginBottom: "1.5rem" }}>
              Whatever scrolls below is what the wire caught before the room went dark.
              Three weirdos arguing about a font, one unsourced photograph of a dog.
              The dog is fine. The dog is always fine. The room is not.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
              <Link href="/dead" className="btn no-underline">Read the death notice</Link>
              <Link href="/rooms" className="btn ghost no-underline">Enter the rooms</Link>
            </div>
          </RevealOnView>
        </div>
        <DiscordTicker />
      </section>
    </>
  );
}
