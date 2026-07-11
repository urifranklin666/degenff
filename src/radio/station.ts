import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type ServerResponse } from "node:http";
import { readdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { desc, isNull, ne, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/db";
import { brainEnabled, think } from "@/discord/brain";
import { BARKER_USER_ID } from "@/lib/rooms-shared";

/**
 * Radio Degeneracy — a transmitter bolted to the R630. Separate process
 * (npm run radio, ops/degenff-radio.service). One ffmpeg at a time reads a
 * source in realtime (-re) and emits a continuous 128k MP3 stream; every
 * connected listener gets the same live chunks, shoutcast-style.
 *
 * Sources, in rotation:
 *   - music files dropped in RADIO_MUSIC_DIR (mp3/ogg/wav/flac/m4a/opus)
 *   - station idents: The Barker via Piper TTS, every few tracks
 *   - dead air (brown noise, faint) when the record crate is empty
 *
 * HTTP on 127.0.0.1:RADIO_PORT — /stream (audio/mpeg) and /status (JSON).
 * The web app proxies both; this port never faces the tunnel directly.
 */

const FFMPEG = process.env.FFMPEG_BIN || "ffmpeg";
const PIPER_BIN = process.env.PIPER_BIN || "piper";
const PIPER_VOICE = process.env.PIPER_VOICE || "";
const MUSIC_DIR = process.env.RADIO_MUSIC_DIR || "/var/lib/degenff/radio";
const PORT = Number(process.env.RADIO_PORT ?? 3847);
const BITRATE = process.env.RADIO_BITRATE || "128k";
const IDENT_EVERY_N_TRACKS = 3;
const DEAD_AIR_SEC = 180;

const AUDIO_EXT = new Set([".mp3", ".ogg", ".wav", ".flac", ".m4a", ".opus", ".aac"]);

const startedAt = Date.now();
const clients = new Set<ServerResponse>();
let nowPlaying = "warming up the transmitter";
let nowKind: "music" | "ident" | "dead-air" = "dead-air";
const history: Array<{ title: string; at: string }> = [];
let currentProc: ChildProcess | null = null;
let shuttingDown = false;

/* ── fan-out ─────────────────────────────────────────────────────────── */

function broadcast(chunk: Buffer) {
  for (const res of clients) {
    // Drop the chunk for slow readers rather than buffering unbounded —
    // a stalled phone should not grow this process's heap.
    if (res.writableLength > 1 << 20) continue;
    res.write(chunk);
  }
}

function setNowPlaying(title: string, kind: typeof nowKind) {
  nowPlaying = title;
  nowKind = kind;
  if (kind === "music") {
    history.unshift({ title, at: new Date().toISOString() });
    history.splice(8);
  }
  console.log(`[radio] now: ${kind} · ${title}`);
}

/* ── one ffmpeg at a time ────────────────────────────────────────────── */

function streamArgs(inputArgs: string[]): string[] {
  return [
    "-hide_banner", "-loglevel", "error",
    "-re",
    ...inputArgs,
    "-vn",
    "-ar", "44100",
    "-ac", "2",
    "-b:a", BITRATE,
    "-f", "mp3",
    "pipe:1",
  ];
}

function playThrough(inputArgs: string[]): Promise<void> {
  return new Promise((resolve) => {
    const proc = spawn(FFMPEG, streamArgs(inputArgs), { stdio: ["ignore", "pipe", "pipe"] });
    currentProc = proc;
    proc.stdout.on("data", (d: Buffer) => broadcast(d));
    proc.stderr.on("data", (d: Buffer) => {
      const line = d.toString().trim();
      if (line) console.error("[radio] ffmpeg:", line.slice(0, 200));
    });
    proc.on("error", (err) => {
      console.error("[radio] ffmpeg spawn failed:", err.message);
      resolve();
    });
    proc.on("close", () => {
      currentProc = null;
      resolve();
    });
  });
}

const playFile = (path: string) => playThrough(["-i", path]);
const playDeadAir = (sec: number) =>
  playThrough(["-f", "lavfi", "-i", `anoisesrc=colour=brown:amplitude=0.035:duration=${sec}`]);

/* ── the record crate ────────────────────────────────────────────────── */

async function scanCrate(): Promise<string[]> {
  try {
    const entries = await readdir(MUSIC_DIR);
    return entries
      .filter((f) => AUDIO_EXT.has(extname(f).toLowerCase()))
      .map((f) => join(MUSIC_DIR, f));
  } catch {
    return [];
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trackTitle(path: string): string {
  return basename(path, extname(path)).replace(/[_-]+/g, " ").trim() || "untitled";
}

/* ── station idents (the barker on air) ──────────────────────────────── */

const CANNED_IDENTS = [
  "you are listening to radio degeneracy. the transmitter is warm and so is the floor.",
  "radio degeneracy. broadcasting from one dell r630 in a house you have never been invited to.",
  "this is radio degeneracy. the wheel spins at the midway. the board is warm. stay tuned or don't, we log both.",
  "radio degeneracy. if you can hear this, the tunnel held. if you can't, none of this happened.",
  "you're on the air with radio degeneracy. no requests. the playlist is whatever survived the crate.",
];

const IDENT_NOTE = `# RADIO IDENT — YOU ARE ON AIR
You are doing a station ident for Radio Degeneracy, the 24/7 stream bolted to the R630. Write ONE short spoken line (a sentence or two, max 40 words) in your voice. It will be read by TTS: plain words only, no glyphs, no markdown, no emoji. Mention the station name. You may reference the tent's attractions (the midway, the séance board, the bureau, the rooms) or, if provided, riff on the latest thing said in the rooms — without naming names cruelly.`;

async function identText(): Promise<string> {
  if (!brainEnabled()) {
    return CANNED_IDENTS[Math.floor(Math.random() * CANNED_IDENTS.length)];
  }
  try {
    let overheard = "";
    try {
      const [msg] = await db
        .select({ body: schema.roomMessages.body })
        .from(schema.roomMessages)
        .where(and(isNull(schema.roomMessages.deletedAt), ne(schema.roomMessages.userId, BARKER_USER_ID)))
        .orderBy(desc(schema.roomMessages.createdAt))
        .limit(1);
      if (msg) overheard = msg.body.slice(0, 200);
    } catch {
      // rooms unreadable — the ident goes out without gossip
    }
    const prompt = overheard
      ? `time for a station ident. overheard in the rooms just now: "${overheard}"`
      : "time for a station ident. the rooms are quiet.";
    const line = await think([{ role: "user", content: prompt }], { extraSystem: IDENT_NOTE });
    if (line) return line.replace(/[◆◇◈⬡⬢◉↗*_`#]/g, "").slice(0, 400);
  } catch (err) {
    console.error("[radio] ident think failed:", err);
  }
  return CANNED_IDENTS[Math.floor(Math.random() * CANNED_IDENTS.length)];
}

function piperToWav(text: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(PIPER_BIN, ["--model", PIPER_VOICE, "--output_file", outPath]);
    let err = "";
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`piper exited ${code}: ${err.trim().slice(0, 200)}`));
    });
    proc.stdin.write(text);
    proc.stdin.end();
  });
}

async function playIdent(): Promise<void> {
  if (!PIPER_VOICE) return; // no voice model — the station stays instrumental
  const text = await identText();
  const wav = join(tmpdir(), `radio-ident-${nanoid(8)}.wav`);
  try {
    await piperToWav(text, wav);
    setNowPlaying("station ident — the barker", "ident");
    await playFile(wav);
  } catch (err) {
    console.error("[radio] ident failed:", err);
  } finally {
    await unlink(wav).catch(() => {});
  }
}

/* ── main loop ───────────────────────────────────────────────────────── */

async function runStation(): Promise<void> {
  let sinceIdent = 0;
  for (;;) {
    if (shuttingDown) return;
    const crate = await scanCrate();
    if (crate.length === 0) {
      await playIdent();
      setNowPlaying("dead air (the crate is empty — drop files in " + MUSIC_DIR + ")", "dead-air");
      await playDeadAir(DEAD_AIR_SEC);
      continue;
    }
    for (const track of shuffle(crate)) {
      if (shuttingDown) return;
      setNowPlaying(trackTitle(track), "music");
      await playFile(track);
      sinceIdent += 1;
      if (sinceIdent >= IDENT_EVERY_N_TRACKS) {
        sinceIdent = 0;
        await playIdent();
      }
    }
  }
}

/* ── http ────────────────────────────────────────────────────────────── */

const server = createServer((req, res) => {
  if (req.url?.startsWith("/stream")) {
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
    });
    clients.add(res);
    console.log(`[radio] listener on (${clients.size} tuned in)`);
    req.on("close", () => {
      clients.delete(res);
      console.log(`[radio] listener off (${clients.size} tuned in)`);
    });
    return;
  }
  if (req.url?.startsWith("/status")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        onAir: true,
        nowPlaying,
        kind: nowKind,
        listeners: clients.size,
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
        history,
      }),
    );
    return;
  }
  res.writeHead(404).end("static");
});

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[radio] ${signal} — signing off`);
  currentProc?.kill("SIGKILL");
  for (const res of clients) res.end();
  server.close();
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[radio] transmitter up on 127.0.0.1:${PORT} · crate: ${MUSIC_DIR}`);
  runStation().catch((err) => {
    console.error("[radio] station loop died:", err);
    process.exit(1);
  });
});
