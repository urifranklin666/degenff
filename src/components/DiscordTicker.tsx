import { recentDiscordTicks, type RecentTick } from "@/lib/discord-recent";

/**
 * Horizontal ticker scrolling Discord activity across the page chrome.
 * Pulls from the discord_activity cache (the bot populates that table).
 * Falls back to placeholder copy when the cache is empty, so the marquee
 * never looks broken in a fresh install.
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

function toTick(r: RecentTick): Tick {
  // Trim messages so a long Discord post doesn't blow the marquee width.
  const text = r.text.length > 140 ? r.text.slice(0, 137) + "…" : r.text;
  return { user: r.user, channel: r.channel, text: text || (r.hasAttachments ? "[attachment]" : "·") };
}

export default async function DiscordTicker() {
  let items: Tick[] = [];
  try {
    const real = await recentDiscordTicks(24);
    items = real.filter((r) => r.text || r.hasAttachments).map(toTick);
  } catch {
    items = [];
  }
  // Fall back to placeholder if the cache is empty (or DB unreachable).
  if (items.length < 4) items = PLACEHOLDER;
  // Duplicate so the marquee loop has continuity.
  const looped = [...items, ...items];

  return (
    <div className="ticker-strip" role="presentation" aria-label="Recent activity in the Discord">
      <span className="ticker-label">FROM THE DISCORD ◆ JUST NOW ◆</span>
      <div className="ticker-track">
        {looped.map((it, i) => (
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
