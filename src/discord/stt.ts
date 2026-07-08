/**
 * STT — whisper.cpp wrapper. Transcribes a 16 kHz mono WAV (produced by the
 * voicechat capture pipeline) to text. Self-hosted on the host's CPU; the
 * binary and a ggml model are host deps (see ops/voice-setup.sh).
 *
 *   16k-mono.wav → whisper-cli -m ggml-base.en.bin -f file -nt → stdout text
 *
 * whisper.cpp does NOT resample — it requires 16 kHz mono in. The caller is
 * responsible for handing us audio in that exact shape.
 */

import { spawn } from "node:child_process";

const WHISPER_BIN = process.env.WHISPER_BIN || "whisper-cli";
const WHISPER_MODEL = process.env.WHISPER_MODEL || ""; // path to ggml-*.bin
const WHISPER_THREADS = process.env.WHISPER_THREADS || ""; // optional -t override

// whisper emits these bracket tags for non-speech segments; they are not words.
const NON_SPEECH = /^\s*[\[(].*[\])]\s*$/;

export function sttEnabled(): boolean {
  return !!WHISPER_MODEL;
}

/** Transcribe a 16 kHz mono WAV file. Returns the cleaned transcript, or "" if
 *  whisper heard nothing usable. Rejects on a non-zero exit. */
export async function transcribe(wavPath: string): Promise<string> {
  if (!WHISPER_MODEL) throw new Error("WHISPER_MODEL not set — STT disabled.");

  const args = ["-m", WHISPER_MODEL, "-f", wavPath, "-nt", "-l", "en"];
  if (WHISPER_THREADS) args.push("-t", WHISPER_THREADS);

  const raw = await new Promise<string>((resolve, reject) => {
    const proc = spawn(WHISPER_BIN, args);
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString())); // whisper logs here
    proc.on("error", reject); // binary not found
    proc.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`whisper exited ${code}: ${err.trim().slice(0, 200)}`));
    });
  });

  // With -nt, stdout is the transcript, one segment per line. Drop non-speech
  // tags and collapse to a single clean line.
  const text = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !NON_SPEECH.test(l))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}
