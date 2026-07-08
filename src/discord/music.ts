/**
 * Music — per-guild voice queue. Plays:
 *   - YouTube via yt-dlp (binary on the host). play-dl was unreliable
 *     because YouTube changes break the JS extractor periodically; yt-dlp
 *     is actively maintained and patches within days.
 *   - Local audio submissions from /var/lib/degenff/uploads/ where
 *     submissions.medium='audio' and submissions.status='approved'.
 *
 * Lifecycle:
 *   - enqueue() joins the user's voice channel if not connected.
 *   - The player drains the queue; on Idle, plays the next track or
 *     (in radio mode) refills from the site's approved audio pool.
 *   - 5 min idle with empty queue → leave voice.
 */

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  entersState,
  getVoiceConnection,
  type VoiceConnection,
  type AudioPlayer,
} from "@discordjs/voice";
import type { GuildMember, VoiceBasedChannel } from "discord.js";
import { eq, and, sql } from "drizzle-orm";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, constants } from "node:fs/promises";
import { join } from "node:path";
import { db, schema } from "@/db";
import { busyReason, claim, release } from "./voiceLock";

const { submissions, users } = schema;

const UPLOAD_ROOT = "/var/lib/degenff/uploads";
const IDLE_LEAVE_MS = 5 * 60 * 1000;

export type Track = {
  kind: "youtube" | "submission";
  title: string;
  url: string;             // YouTube URL or `submission:<id>`
  durationSec?: number;
  requestedBy: string;     // Discord user tag
  // For "submission" tracks
  submissionId?: string;
  submitterHandle?: string;
  filePath?: string;       // absolute path
};

type GuildState = {
  guildId: string;
  channelId: string;
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: Track[];
  current: Track | null;
  radio: boolean;
  leaveTimer: NodeJS.Timeout | null;
  ytdlpProc: ChildProcessWithoutNullStreams | null;
};

const guilds = new Map<string, GuildState>();

/** Spawn yt-dlp and parse one JSON line. Use -j for one URL, --flat-playlist
 *  + -J for playlists; for searches, use ytsearch1: prefix. */
function ytdlpMeta(query: string): Promise<{
  id: string;
  title: string;
  duration?: number;
  webpage_url: string;
}> {
  return new Promise((resolve, reject) => {
    const target = /^https?:\/\//i.test(query) ? query : `ytsearch1:${query}`;
    const proc = spawn("yt-dlp", [
      "-j",
      "--no-warnings",
      "--no-playlist",
      "--default-search", "ytsearch1",
      target,
    ]);
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp exited ${code}: ${err.trim().slice(0, 200)}`));
      }
      try {
        // -j prints one JSON per line; for a single result, take the first line.
        const line = out.split("\n").find((l) => l.trim().startsWith("{"));
        if (!line) return reject(new Error("yt-dlp returned no metadata."));
        const j = JSON.parse(line);
        resolve({
          id: j.id,
          title: j.title ?? "(untitled)",
          duration: typeof j.duration === "number" ? j.duration : undefined,
          webpage_url: j.webpage_url ?? j.url ?? query,
        });
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  });
}

/** Spawn yt-dlp streaming the best audio format to stdout. Caller owns the
 *  child and must kill() it when the player goes Idle/Error. */
function ytdlpStream(url: string): ChildProcessWithoutNullStreams {
  return spawn("yt-dlp", [
    "-f", "bestaudio/best",
    "--no-warnings",
    "--no-playlist",
    "-o", "-",
    "--quiet",
    url,
  ]);
}

function clearLeaveTimer(s: GuildState) {
  if (s.leaveTimer) {
    clearTimeout(s.leaveTimer);
    s.leaveTimer = null;
  }
}

function killYtdlp(s: GuildState) {
  if (s.ytdlpProc) {
    try {
      s.ytdlpProc.kill("SIGKILL");
    } catch {}
    s.ytdlpProc = null;
  }
}

function scheduleLeave(s: GuildState) {
  clearLeaveTimer(s);
  s.leaveTimer = setTimeout(() => {
    leave(s.guildId).catch((err) => console.error("[music] leave failed:", err));
  }, IDLE_LEAVE_MS);
}

export function getState(guildId: string): GuildState | undefined {
  return guilds.get(guildId);
}

async function ensureConnection(member: GuildMember): Promise<GuildState> {
  const voice = member.voice.channel as VoiceBasedChannel | null;
  if (!voice) throw new Error("Join a voice channel first.");

  // The Barker can't DJ and hold a conversation at once — refuse if voice-chat
  // mode owns this guild's connection.
  if (!claim(voice.guildId, "music")) throw new Error(busyReason("music"));

  const existing = guilds.get(voice.guildId);
  if (existing && existing.channelId === voice.id) return existing;

  const connection = joinVoiceChannel({
    channelId: voice.id,
    guildId: voice.guildId,
    adapterCreator: voice.guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: false,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch {
    connection.destroy();
    release(voice.guildId, "music");
    throw new Error("Couldn't open the voice channel. Check Connect/Speak permissions.");
  }

  const player = createAudioPlayer();
  connection.subscribe(player);

  const state: GuildState = {
    guildId: voice.guildId,
    channelId: voice.id,
    connection,
    player,
    queue: [],
    current: null,
    radio: false,
    leaveTimer: null,
    ytdlpProc: null,
  };

  player.on(AudioPlayerStatus.Idle, () => {
    state.current = null;
    killYtdlp(state);
    void advance(state);
  });
  player.on("error", (err) => {
    console.error("[music] player error:", err);
    state.current = null;
    killYtdlp(state);
    void advance(state);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      // Real disconnect — clean up
      killYtdlp(state);
      guilds.delete(state.guildId);
      release(state.guildId, "music");
      try {
        connection.destroy();
      } catch {}
    }
  });

  guilds.set(voice.guildId, state);
  return state;
}

function buildResource(state: GuildState, track: Track) {
  if (track.kind === "youtube") {
    const proc = ytdlpStream(track.url);
    proc.stderr.on("data", (d) => {
      // yt-dlp likes to print progress here even with --quiet; ignore unless
      // it errors out. Only log the first ~200 chars so we don't spam.
      const s = d.toString();
      if (/error/i.test(s)) console.error("[music] yt-dlp:", s.trim().slice(0, 200));
    });
    proc.on("error", (err) => console.error("[music] yt-dlp spawn error:", err));
    state.ytdlpProc = proc;
    return createAudioResource(proc.stdout, { inputType: StreamType.Arbitrary, inlineVolume: false });
  }
  if (!track.filePath) throw new Error("Submission track has no file path.");
  const stream = createReadStream(track.filePath);
  return createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: false });
}

async function pickRandomSubmission(): Promise<Track | null> {
  const rows = await db
    .select({
      id: submissions.id,
      title: submissions.title,
      files: submissions.files,
      handle: users.handle,
    })
    .from(submissions)
    .leftJoin(users, eq(submissions.userId, users.id))
    .where(and(eq(submissions.status, "approved"), eq(submissions.medium, "audio")))
    .orderBy(sql`random()`)
    .limit(20);

  for (const row of rows) {
    const audioFile = (row.files ?? []).find((f) => f.mime.startsWith("audio/"));
    if (!audioFile) continue;
    const abs = join(UPLOAD_ROOT, audioFile.path);
    try {
      await access(abs, constants.R_OK);
    } catch {
      continue;
    }
    return {
      kind: "submission",
      title: row.title,
      url: `submission:${row.id}`,
      requestedBy: "radio",
      submissionId: row.id,
      submitterHandle: row.handle ?? "anon",
      filePath: abs,
    };
  }
  return null;
}

async function advance(state: GuildState): Promise<void> {
  let next = state.queue.shift() ?? null;
  if (!next && state.radio) {
    next = await pickRandomSubmission();
  }
  if (!next) {
    scheduleLeave(state);
    return;
  }
  clearLeaveTimer(state);
  state.current = next;
  try {
    const resource = buildResource(state, next);
    state.player.play(resource);
  } catch (err) {
    console.error("[music] play failed:", err);
    state.current = null;
    killYtdlp(state);
    void advance(state);
  }
}

export async function enqueue(
  member: GuildMember,
  query: string,
  requestedBy: string,
): Promise<{ track: Track; position: number }> {
  const state = await ensureConnection(member);

  // Reject non-YouTube URLs to keep the surface tight. yt-dlp supports a
  // long list of sites; expand here once we want to formally allow them.
  if (/^https?:\/\//i.test(query)) {
    const okHost = /(youtube\.com|youtu\.be|music\.youtube\.com)/i.test(query);
    if (!okHost) throw new Error("Only YouTube links and search terms are supported.");
  }

  const meta = await ytdlpMeta(query);
  const track: Track = {
    kind: "youtube",
    title: meta.title,
    url: meta.webpage_url,
    durationSec: meta.duration,
    requestedBy,
  };

  state.queue.push(track);
  const position = state.current ? state.queue.length : 1;
  if (!state.current) await advance(state);
  return { track, position };
}

export async function startRadio(member: GuildMember): Promise<Track | null> {
  const state = await ensureConnection(member);
  state.radio = true;
  if (!state.current && state.queue.length === 0) {
    await advance(state);
  }
  return state.current;
}

export function skip(guildId: string): Track | null {
  const state = guilds.get(guildId);
  if (!state) return null;
  const skipped = state.current;
  state.player.stop(true); // fires Idle; advance() handles next, killYtdlp runs in Idle handler
  return skipped;
}

export function stop(guildId: string): boolean {
  const state = guilds.get(guildId);
  if (!state) return false;
  state.queue = [];
  state.radio = false;
  state.current = null;
  killYtdlp(state);
  state.player.stop(true);
  return true;
}

export async function leave(guildId: string): Promise<boolean> {
  const state = guilds.get(guildId);
  const conn = state?.connection ?? getVoiceConnection(guildId);
  if (state) {
    clearLeaveTimer(state);
    killYtdlp(state);
    state.queue = [];
    state.radio = false;
    state.current = null;
    state.player.stop(true);
  }
  if (conn) {
    try {
      conn.destroy();
    } catch (err) {
      console.error("[music] destroy failed:", err);
    }
  }
  guilds.delete(guildId);
  release(guildId, "music");
  return !!conn;
}

export function snapshot(guildId: string) {
  const s = guilds.get(guildId);
  if (!s) return null;
  return {
    channelId: s.channelId,
    current: s.current,
    queue: [...s.queue],
    radio: s.radio,
  };
}

export function formatDuration(sec?: number): string {
  if (!sec || !Number.isFinite(sec)) return "?:??";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
