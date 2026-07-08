/**
 * Shared oracle-line pool. The bot reads these for random "drops" into
 * DISCORD_DROP_CHANNEL_ID; the site picks one per page render for a small
 * manifesto-voice callout. Single source of truth so the two stay in sync.
 */
export const GOOSE_LINES = [
  "the goose has spoken",
  "the goose did not have a name",
  "the goose is fine. the goose is always fine.",
  "the carpet smells different today",
  "the door was locked from the inside",
  "we have been expecting you",
  "consent was implied at the door",
  "we kept the receipts but lost the body",
  "subject refuses counsel",
  "shoes off · no attorney present",
  "step right up · proceed voluntarily",
  "the dental records did not match",
  "every exit is also an entrance",
  "no refunds were issued. none requested.",
  "the pigeon is also fine. don't ask.",
  "we are not running a daycare. we are running a haunted petting zoo.",
  "do not feed the moderators",
  "the lights came on by themselves",
  "boring is a moderation reason",
  "if it's weird, it's probably welcome",
] as const;

export function pickOracleLine(): string {
  return GOOSE_LINES[Math.floor(Math.random() * GOOSE_LINES.length)];
}
