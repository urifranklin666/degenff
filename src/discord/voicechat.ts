/**
 * Voice chat — the Barker's full-duplex presence in a voice channel. He hears
 * the room, transcribes it locally, and chimes in like a person at the table:
 * speaks when addressed or when he's got something, stays quiet otherwise.
 *
 *   VC audio ─▶ receiver (per-speaker Opus)
 *           ─▶ prism Opus decode ─▶ ffmpeg → 16k mono WAV
 *           ─▶ whisper.cpp (stt.ts) ─▶ transcript line
 *           ─▶ rolling buffer ─▶ brain.think({spoken}) ─▶ reply | [PASS]
 *           ─▶ Piper (tts.ts) ─▶ AudioPlayer ─▶ VC
 *
 * Mutually exclusive with music.ts per guild, arbitrated by voiceLock.ts.
 *
 * Deliberately half-duplex in turn-taking for v1: while the Barker is speaking
 * we don't capture or respond (no barge-in / interruption). All state is
 * in-memory and resets on bot restart, same as converse.ts.
 *
 * Unlike music.ts this connection joins with selfDeaf:FALSE — a deafened bot
 * receives no audio, and hearing the room is the whole point.
 */

import {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  EndBehaviorType,
  entersState,
  getVoiceConnection,
  type VoiceConnection,
  type AudioPlayer,
  type VoiceReceiver,
} from "@discordjs/voice";
import type { Client, Guild, GuildMember, VoiceBasedChannel, VoiceState } from "discord.js";
import { eq } from "drizzle-orm";
import { spawn } from "node:child_process";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nanoid } from "nanoid";
import prism from "prism-media";
import { db, schema } from "@/db";
import { brainEnabled, PASS_TOKEN, think, type BrainTurn } from "./brain";
import { sttEnabled, transcribe } from "./stt";
import { synthesize, ttsEnabled } from "./tts";
import type { ActorCtx } from "./tools";
import { claim, holder, release } from "./voiceLock";

const { users } = schema;

const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg";

// ── capture
const SILENCE_MS = 800; // trailing quiet that closes an utterance
const MIN_PCM_BYTES = 60_000; // ~0.3s of 48k stereo s16 — below this it's a click, skip whisper

// ── transcript buffer fed to the brain
const CONTEXT_LIMIT = 14;
const MSG_CLAMP = 800;
const MAX_SPOKEN = 600; // hard cap before TTS (mirrors tts MAX_CHARS)

// ── chime-in gating (mirrors converse.ts so voice feels like the same persona)
const KEYWORD_RE = /\b(barker|degenff|degeneratefuckface)\b/i;
const ADDRESSED_COOLDOWN_MS = 2_000;
const ENGAGED_MS = 10 * 60_000;
const ENGAGED_COOLDOWN_MS = 4_000;
const ENGAGED_CHANCE = 0.85;
const AMBIENT_COOLDOWN_MS = 30_000;
const AMBIENT_CHANCE = 0.25;

const IDLE_LEAVE_MS = 5 * 60_000; // leave an idle channel

type Turn = BrainTurn & { at: number };

type GuildState = {
  guildId: string;
  channelId: string;
  guild: Guild;
  connection: VoiceConnection;
  player: AudioPlayer;
  receiver: VoiceReceiver;
  transcript: Turn[];
  capturing: Set<string>; // userIds with a live capture stream
  speaking: boolean; // TTS playing — we neither listen nor respond
  thinking: boolean; // a think→speak cycle is in flight
  lastReplyAt: number;
  engagedUntil: number;
  ttsCleanup: (() => void) | null;
  idleTimer: NodeJS.Timeout | null;
};

const guilds = new Map<string, GuildState>();

export function voiceChatEnabled(): boolean {
  return brainEnabled() && ttsEnabled() && sttEnabled();
}

export function isActive(guildId: string): boolean {
  return guilds.has(guildId);
}

/** Join the caller's voice channel and start listening. Throws with a
 *  user-facing message on any refusal. */
export async function joinVoiceChat(member: GuildMember): Promise<{ channelName: string }> {
  if (!voiceChatEnabled()) {
    throw new Error("Voice chat isn't wired up on this box (need ANTHROPIC_API_KEY + Piper + whisper).");
  }
  const voice = member.voice.channel as VoiceBasedChannel | null;
  if (!voice) throw new Error("Join a voice channel first.");

  const existing = guilds.get(voice.guildId);
  if (existing) {
    if (existing.channelId === voice.id) return { channelName: voice.name };
    // Move to the caller's channel: tear the old one down first.
    await leaveVoiceChat(voice.guildId);
  }

  if (!claim(voice.guildId, "voice-chat")) {
    const h = holder(voice.guildId);
    throw new Error(h === "music" ? "Music is playing — `/stop` it before I can listen." : "Voice is busy.");
  }

  let connection: VoiceConnection;
  try {
    connection = joinVoiceChannel({
      channelId: voice.id,
      guildId: voice.guildId,
      adapterCreator: voice.guild.voiceAdapterCreator,
      selfDeaf: false, // MUST hear the room
      selfMute: false,
    });
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch {
    release(voice.guildId, "voice-chat");
    try {
      getVoiceConnection(voice.guildId)?.destroy();
    } catch {}
    throw new Error("Couldn't open the voice channel. Check Connect/Speak permissions.");
  }

  const player = createAudioPlayer();
  connection.subscribe(player);

  const state: GuildState = {
    guildId: voice.guildId,
    channelId: voice.id,
    guild: voice.guild,
    connection,
    player,
    receiver: connection.receiver,
    transcript: [],
    capturing: new Set(),
    speaking: false,
    thinking: false,
    lastReplyAt: 0,
    engagedUntil: 0,
    ttsCleanup: null,
    idleTimer: null,
  };

  player.on(AudioPlayerStatus.Idle, () => {
    state.speaking = false;
    if (state.ttsCleanup) {
      state.ttsCleanup();
      state.ttsCleanup = null;
    }
    resetIdle(state);
  });
  player.on("error", (err) => {
    console.error("[voicechat] player error:", err);
    state.speaking = false;
    if (state.ttsCleanup) {
      state.ttsCleanup();
      state.ttsCleanup = null;
    }
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      await leaveVoiceChat(state.guildId);
    }
  });

  state.receiver.speaking.on("start", (userId) => void beginCapture(state, userId));

  guilds.set(voice.guildId, state);
  resetIdle(state);
  return { channelName: voice.name };
}

export async function leaveVoiceChat(guildId: string): Promise<boolean> {
  const state = guilds.get(guildId);
  const conn = state?.connection ?? getVoiceConnection(guildId);
  if (state) {
    if (state.idleTimer) clearTimeout(state.idleTimer);
    if (state.ttsCleanup) state.ttsCleanup();
    state.player.stop(true);
  }
  if (conn) {
    try {
      conn.destroy();
    } catch (err) {
      console.error("[voicechat] destroy failed:", err);
    }
  }
  guilds.delete(guildId);
  release(guildId, "voice-chat");
  return !!conn;
}

function resetIdle(state: GuildState) {
  if (state.idleTimer) clearTimeout(state.idleTimer);
  state.idleTimer = setTimeout(() => {
    void leaveVoiceChat(state.guildId);
  }, IDLE_LEAVE_MS);
}

/** Subscribe to one speaker, capture their utterance to a WAV, transcribe it. */
async function beginCapture(state: GuildState, userId: string) {
  if (state.speaking) return; // v1: don't listen while we talk
  if (state.capturing.has(userId)) return;

  let member = state.guild.members.cache.get(userId) ?? null;
  if (!member) member = await state.guild.members.fetch(userId).catch(() => null);
  if (!member || member.user.bot) return; // ignore bots (and ourselves)

  state.capturing.add(userId);
  const opusStream = state.receiver.subscribe(userId, {
    end: { behavior: EndBehaviorType.AfterSilence, duration: SILENCE_MS },
  });

  const wavPath = await captureUtterance(opusStream).catch(() => null);
  state.capturing.delete(userId);
  if (!wavPath) return;

  let text = "";
  try {
    text = await transcribe(wavPath);
  } catch (err) {
    console.error("[voicechat] transcribe failed:", err);
  } finally {
    void unlink(wavPath).catch(() => {});
  }
  if (!text) return;

  const name = member.displayName || member.user.username;
  await onUtterance(state, member, name, text);
}

/** opus packets → PCM → ffmpeg → 16k mono WAV. Resolves the temp path, or null
 *  if the utterance was too short to be worth transcribing. */
function captureUtterance(opusStream: NodeJS.ReadableStream): Promise<string | null> {
  return new Promise((resolve) => {
    const outPath = join(tmpdir(), `barker-stt-${nanoid(10)}.wav`);
    const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
    const ff = spawn(FFMPEG_BIN, [
      "-f", "s16le", "-ar", "48000", "-ac", "2", "-i", "pipe:0",
      "-ar", "16000", "-ac", "1", "-y", outPath,
    ]);

    let pcmBytes = 0;
    let settled = false;
    const done = (val: string | null) => {
      if (settled) return;
      settled = true;
      if (val === null) void unlink(outPath).catch(() => {});
      resolve(val);
    };

    decoder.on("data", (c: Buffer) => (pcmBytes += c.length));
    opusStream.on("error", () => {});
    decoder.on("error", () => {});
    ff.stdin.on("error", () => {}); // EPIPE if ffmpeg dies early
    ff.on("error", () => done(null)); // ffmpeg binary missing
    ff.on("close", () => done(pcmBytes < MIN_PCM_BYTES ? null : outPath));

    opusStream.pipe(decoder).pipe(ff.stdin);
  });
}

async function onUtterance(state: GuildState, member: GuildMember, name: string, text: string) {
  const now = Date.now();
  pushTurn(state, { role: "user", content: `${name}: ${text.slice(0, MSG_CLAMP)}`, at: now });
  resetIdle(state);

  // Already mid-reply: keep the line for context, but don't stack a response.
  if (state.speaking || state.thinking) return;

  const addressed = KEYWORD_RE.test(text);
  const engaged = state.engagedUntil > now;
  const sinceReply = now - state.lastReplyAt;

  let respond = false;
  if (addressed) {
    respond = sinceReply > ADDRESSED_COOLDOWN_MS;
    state.engagedUntil = now + ENGAGED_MS;
  } else if (engaged) {
    respond = sinceReply > ENGAGED_COOLDOWN_MS && Math.random() < ENGAGED_CHANCE;
  } else {
    respond = sinceReply > AMBIENT_COOLDOWN_MS && Math.random() < AMBIENT_CHANCE;
  }
  if (!respond) return;

  state.thinking = true;
  state.lastReplyAt = now;
  try {
    const actor = await resolveActor(state.guild.client, member.id);
    const reply = await think(turnsFor(state), { channelId: state.channelId, actor, spoken: true });
    if (!reply) return;
    if (reply === PASS_TOKEN || reply.startsWith(PASS_TOKEN)) return;
    const spoken = reply.slice(0, MAX_SPOKEN);
    pushTurn(state, { role: "assistant", content: spoken, at: Date.now() });
    await speak(state, spoken);
  } catch (err) {
    console.error("[voicechat] reply failed:", err);
  } finally {
    state.thinking = false;
  }
}

async function speak(state: GuildState, text: string) {
  state.speaking = true;
  try {
    const { resource, cleanup } = await synthesize(text);
    state.ttsCleanup = cleanup;
    state.player.play(resource);
    // speaking flips back to false in the player's Idle/error handler.
  } catch (err) {
    console.error("[voicechat] tts failed:", err);
    state.speaking = false;
  }
}

function pushTurn(state: GuildState, turn: Turn) {
  state.transcript.push(turn);
  if (state.transcript.length > CONTEXT_LIMIT) {
    state.transcript.splice(0, state.transcript.length - CONTEXT_LIMIT);
  }
}

/** Strip the timestamps; the brain wants plain BrainTurns. */
function turnsFor(state: GuildState): BrainTurn[] {
  return state.transcript.map(({ role, content }) => ({ role, content }));
}

async function resolveActor(client: Client, discordUserId: string): Promise<ActorCtx> {
  const u = await db.query.users.findFirst({ where: eq(users.discordId, discordUserId) });
  return {
    client,
    discordId: discordUserId,
    modUserId: u?.id ?? null,
    role: u?.role ?? null,
  };
}

/** Speak an arbitrary line on demand (the /say command). Requires an active
 *  voice-chat session in the guild. */
export async function say(guildId: string, text: string): Promise<void> {
  const state = guilds.get(guildId);
  if (!state) throw new Error("I'm not in a voice channel — `/voice join` first.");
  if (!ttsEnabled()) throw new Error("TTS isn't configured on this box.");
  const line = text.trim().slice(0, MAX_SPOKEN);
  if (!line) throw new Error("Say what?");
  resetIdle(state);
  await speak(state, line);
}

/** Auto-leave when the bot is left alone (or its channel empties). Wired from
 *  the client's voiceStateUpdate in handlers.ts. */
export async function onVoiceStateUpdate(oldState: VoiceState) {
  const guildId = oldState.guild.id;
  const state = guilds.get(guildId);
  if (!state) return;
  const channel = state.guild.channels.cache.get(state.channelId);
  if (!channel || !channel.isVoiceBased()) return;
  const humans = channel.members.filter((m) => !m.user.bot).size;
  if (humans === 0) await leaveVoiceChat(guildId);
}

export function registerVoiceChat() {
  if (!voiceChatEnabled()) {
    const missing = [
      !brainEnabled() && "ANTHROPIC_API_KEY",
      !ttsEnabled() && "PIPER_VOICE",
      !sttEnabled() && "WHISPER_MODEL",
    ].filter(Boolean);
    console.log(`[voicechat] disabled — missing: ${missing.join(", ")}`);
    return;
  }
  console.log("[voicechat] online — full-duplex voice presence ready");
}
