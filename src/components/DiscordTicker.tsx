/**
 * Horizontal ticker scrolling Discord activity across the page chrome.
 * TODO: wire to real data via `select() from discordActivity order by createdAt desc limit 24`
 * — for now uses dossier-flavored placeholder copy that matches the manifesto voice.
 */

type Tick = { user: string; channel: string; text: string };

const PLACEHOLDER: Tick[] = [
  { user: "@bonecouch",   channel: "#chaos",     text: "is the goose still alive" },
  { user: "@steamroller", channel: "#feats",     text: "shipped the parser. fed it 14MB of garbage. it asked for more" },
  { user: "@mothlight",   channel: "#chaos",     text: "found a pigeon under the desk" },
  { user: "@nightporter", channel: "#mod",       text: "approved a 47-minute audio submission about lawnmowers" },
  { user: "@dentist",     channel: "#feats",     text: "wrote a compiler in a single weekend. it compiles itself badly" },
  { user: "@hallway",     channel: "#chaos",     text: "the door is locked from the inside again" },
  { user: "@rev",         channel: "#submissions", text: "the new submission is just a JPG of someone's foot. approved" },
  { user: "@operator",    channel: "#mod",       text: "we are not running a daycare. we are running a haunted petting zoo" },
  { user: "@bonecouch",   channel: "#chaos",     text: "the carpet smells different today" },
  { user: "@steamroller", channel: "#feats",     text: "fed it 28MB of garbage. there is no upper bound to this thing's appetite" },
  { user: "@dentist",     channel: "#submissions", text: "i would die for the file titled 'unholy.gif'" },
  { user: "@hallway",     channel: "#chaos",     text: "everyone is fine. the goose is fine. the goose is always fine" },
];

export default function DiscordTicker() {
  // duplicate so the marquee loop has continuity
  const items = [...PLACEHOLDER, ...PLACEHOLDER];
  return (
    <div className="ticker-strip" role="presentation" aria-label="Recent activity in the Discord">
      <span className="ticker-label">FROM THE DISCORD ◆ JUST NOW ◆</span>
      <div className="ticker-track">
        {items.map((it, i) => (
          <span className="ticker-item" key={i}>
            <span className="user">{it.user}</span>
            <span className="channel">{it.channel}</span>
            <span className="ticker-text">{it.text}</span>
            <span className="ticker-sep" aria-hidden>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
