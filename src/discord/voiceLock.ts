/**
 * Per-guild voice mode lock. The bot has exactly one voice connection per
 * guild, and two subsystems want it: music.ts (jukebox) and voicechat.ts
 * (the Barker's full-duplex presence). They are mutually exclusive by design
 * — the bot is a conversationalist OR a jukebox in a given guild, never both.
 *
 * Lives in its own module so music.ts and voicechat.ts can both depend on it
 * without importing each other (which would be a cycle).
 */

export type VoiceMode = "music" | "voice-chat";

const locks = new Map<string, VoiceMode>(); // guildId → current holder

export function holder(guildId: string): VoiceMode | null {
  return locks.get(guildId) ?? null;
}

/** Claim the guild's voice slot for `mode`. Returns false if the other mode
 *  already holds it. Idempotent for the same mode. */
export function claim(guildId: string, mode: VoiceMode): boolean {
  const cur = locks.get(guildId);
  if (cur && cur !== mode) return false;
  locks.set(guildId, mode);
  return true;
}

/** Release the slot, but only if `mode` is the current holder. */
export function release(guildId: string, mode: VoiceMode): void {
  if (locks.get(guildId) === mode) locks.delete(guildId);
}

/** Human-readable reason for a refused claim, for surfacing in chat. */
export function busyReason(mode: VoiceMode): string {
  return mode === "music"
    ? "The Barker is holding voice chat right now — `/voice leave` first."
    : "Music is playing in voice right now — `/stop` it first.";
}
