import Link from "next/link";
import BulbMarquee from "@/components/BulbMarquee";
import Tile from "@/components/Tile";
import Glitch from "@/components/Glitch";
import PrizeStamp from "@/components/PrizeStamp";
import RevealOnView from "@/components/RevealOnView";
import Scratch from "@/components/Scratch";

export const metadata = {
  title: "Degeneracy Is Dead",
  description:
    "Notice of death. The Discord went dark and took the chat with it. The tent stands. We are building our own rooms.",
};

const TOP_MARQUEE = [
  "NOTICE OF DEATH",
  "THE SUGAR STOPPED",
  "DISCORD IS DOWN",
  "THE ROOM WAS RENTED",
  "THE TENT WAS NOT",
  "NO FLOWERS",
  "BRING LUMBER",
  "SERVICES ONGOING",
];

const BOTTOM_MARQUEE = [
  "LONG LIVE DEGENERACY",
  "SELF-HOSTED OR NOTHING",
  "NO MORE LANDLORDS",
  "THE BARKER SURVIVED",
  "POSTGRES REMEMBERS",
  "ONE R630",
  "BRING YOUR OWN CHAIRS",
  "THE WAKE IS BYOB",
];

export default function DeadPage() {
  return (
    <>
      <BulbMarquee items={TOP_MARQUEE} pattern={["b", "a", "d", "c"]} />

      <section className="hero">
        <span className="huge-digit tl" aria-hidden>00</span>
        <span className="huge-digit br" aria-hidden>†</span>

        <div className="container" style={{ position: "relative" }}>
          <span className="eyebrow slam-in">{"// Notice Of Death // Posted At The Door"}</span>

          <div className="slam-stack glitch-react" style={{ marginTop: "1rem" }}>
            <span className="line slam slam-in delay-1">
              <Glitch text="DEGENERACY" alts={["DEPENDENCY", "DISCONNECTED"]} />
            </span>
            <span className="line menace slam-in delay-2">
              <em>is dead. we checked twice.</em>
            </span>
            <span className="line slam slam-in delay-3">
              <span className="skew">LONG LIVE DEGENERACY</span>
            </span>
            <span className="line blip slam-in delay-4" style={{ marginTop: "0.7rem" }}>
              ▮ cause of death: someone else&apos;s server ▮ time of death: when the sugar stopped ▮
            </span>
          </div>

          <p className="lede" style={{ marginTop: "1.8rem", maxWidth: "62ch" }}>
            The Discord went dark and took the chat, the bot, and the voice channel with it.
            Not because we broke anything. Because the room was never ours. We built a cult
            on rented land and the landlord turned the lights off without knocking.
            This page is the obituary. It is also the building permit.
          </p>

          <div className="discord-stats">
            <div className="stat">
              <span className="num">0</span>
              <span className="label">bpm, the old spine</span>
            </div>
            <div className="stat">
              <span className="num">3rd&nbsp;party</span>
              <span className="label">cause of death</span>
            </div>
            <div className="stat">
              <span className="num">100%</span>
              <span className="label">of the tent still ours</span>
            </div>
            <div className="stat">
              <span className="num">1</span>
              <span className="label">Dell R630, still humming</span>
            </div>
          </div>

          <div style={{ marginTop: "2.25rem", display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/rooms" className="btn no-underline">Enter the rooms</Link>
            <a href="#plan" className="btn ghost no-underline">Read the plan</a>
            <PrizeStamp tone="banned" rotate="r-n8" style={{ alignSelf: "center" }}>
              DECEASED · DO NOT RESUSCITATE
            </PrizeStamp>
          </div>
        </div>
      </section>

      <BulbMarquee items={BOTTOM_MARQUEE} pattern={["a", "b", "c", "d"]} />

      <section className="section">
        <div className="container" style={{ maxWidth: "72ch" }}>
          <RevealOnView>
            <span className="eyebrow">{"// Autopsy"}</span>
            <h2 className="section-title">
              What Actually Died. <em>And what didn&apos;t.</em>
            </h2>
            <div className="lede" style={{ display: "grid", gap: "1.25rem", color: "var(--text)" }}>
              <p>
                <b>What died:</b> the room. The chat, the buttons, the voice channel — every part of
                this operation that lived inside somebody else&apos;s app. When their servers cough,
                our community flatlines. That was the deal the whole time. We just didn&apos;t like
                reading the fine print out loud.
              </p>
              <p>
                <b>What didn&apos;t:</b> everything that matters. The site is up. The gallery is up.
                The queue is up. The Barker&apos;s brain, memory, ears, and mouth all run as processes
                on hardware we can touch — only its <i>doorway</i> was Discord. Postgres has every
                record. The uploads are on our disk. The body count from this outage is exactly one:
                a dependency.
              </p>
              <p>
                <b>Ruling:</b> death by{" "}
                <Scratch cover="REDACTED">building the load-bearing wall out of someone else&apos;s API</Scratch>.
                The coroner recommends we never do that again.
              </p>
            </div>
          </RevealOnView>
        </div>
      </section>

      <section className="section" id="plan">
        <div className="container">
          <RevealOnView>
            <span className="eyebrow">{"// The Plan // Same Cult, Our Floorboards"}</span>
            <h2 className="section-title">
              We Build Our Own. <em>All of it.</em><br />On The Machine That Never Left.
            </h2>
            <p className="lede" style={{ marginBottom: "2.5rem", color: "var(--text)" }}>
              Everything we were doing in there — the chat, the bots, the voice, the rooms — moves
              in-house. Not a bridge to the next rented platform. Ours, on the R630, behind the same
              tunnel, in the same Postgres that already remembers your name. Four rooms to raise:
            </p>
          </RevealOnView>

          <div className="tiles">
            <Tile
              index="01"
              glyph="◈"
              title="The Rooms"
              body="Self-hosted chat. Rooms, presence, the arguing-about-fonts room — live over our own wire, stored in our own Postgres. No message ever leaves the building again. If it goes down, it's because we broke it, and we can fix what we broke. Doors are open now."
              tags={["live wire", "our postgres", "our outages only"]}
              stamp="OPEN"
              skew="deep-l"
            />
            <Tile
              index="02"
              glyph="◉"
              title="The Barker, Rehomed"
              body="The bot already lives here — brain, tools, memory, all local processes. Discord was just the mouth-hole we rented for it. We give it a new one: it joins the rooms as a resident, runs the mod queue, chimes in when addressed, and never gets evicted again."
              tags={["already local", "mod queue", "chimes in"]}
              stamp="ALIVE"
              skew="r"
            />
            <Tile
              index="03"
              glyph="⬡"
              title="Identity, Ours"
              body="Sign-in stops routing through a landlord. Your account, your roles, your record — already in our database; the OAuth hop was ceremony. Mods stay mods because we say so, not because a third party's role table agrees."
              tags={["own auth", "roles in-house", "no oauth landlord"]}
              stamp="OURS"
              skew="deep-r"
            />
            <Tile
              index="04"
              glyph="⬢"
              title="The Voice"
              body="Whisper hears on our CPU. Piper speaks from our disk. Neither ever needed Discord — they needed a wire. WebRTC into our own voice rooms and the Barker sits at the table like a person, on binaries we installed with our own hands."
              tags={["whisper.cpp", "piper", "webrtc"]}
              stamp="WIRED"
              skew="l"
            />
          </div>
        </div>
      </section>

      <section className="section" style={{ borderBottom: "none" }}>
        <div className="container" style={{ maxWidth: "72ch" }}>
          <RevealOnView>
            <span className="eyebrow">{"// The Wake"}</span>
            <h2 className="section-title">
              No Flowers. <em>Bring lumber.</em>
            </h2>
            <div className="lede" style={{ display: "grid", gap: "1.25rem", color: "var(--text)" }}>
              <p>
                We are not migrating to the next app. We are not waiting for status.discord.com to
                turn green so we can resume pretending. The outage did us a favor: it showed us the
                one wall we didn&apos;t build, by knocking it down.
              </p>
              <p>
                The queue still takes your work. The feats page still takes your bragging. And the
                first rooms are already open — on the same machine that never stopped humming through
                all of this, behind doors that swing on hinges we own. Walk in:{" "}
                <Link href="/rooms">/rooms</Link>.
              </p>
              <p style={{ color: "var(--text-bright)" }}>
                <b>Degeneracy is dead.</b> It died of dependency. What we bury is the landlord,
                not the cult. Long live degeneracy — self-hosted, oxblood on black, every line of
                it ours.
              </p>
            </div>
            <div style={{ marginTop: "2rem", display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/submit" className="btn no-underline">The queue never closed</Link>
              <Link href="/about" className="btn ghost no-underline">Read the manifesto</Link>
              <PrizeStamp tone="evidence" rotate="r-n12">
                EXHIBIT A · THE OUTAGE
              </PrizeStamp>
            </div>
          </RevealOnView>
        </div>
      </section>
    </>
  );
}
