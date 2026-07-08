/**
 * TTS — Piper wrapper. Turns a line of text into an audio resource the voice
 * player can stream. Self-hosted, zero cloud bills: piper is a host binary
 * (like yt-dlp), driven with a local .onnx voice model.
 *
 *   text ─(stdin)→ piper --model voice.onnx --output_file tmp.wav
 *               → createReadStream → @discordjs/voice (Arbitrary → ffmpeg → Opus)
 *
 * We write a temp WAV rather than streaming raw stdout: Piper's raw output is
 * mono at the model's own sample rate, and letting @discordjs/voice's FFmpeg
 * stage transcode a well-formed WAV is the robust path. Caller MUST invoke the
 * returned cleanup() once playback ends, or temp files accumulate.
 */

import { createAudioResource, StreamType, type AudioResource } from "@discordjs/voice";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nanoid } from "nanoid";

const PIPER_BIN = process.env.PIPER_BIN || "piper";
const PIPER_VOICE = process.env.PIPER_VOICE || ""; // path to a .onnx voice model

// Hard ceiling on a single spoken line. Long replies read terribly aloud and
// hold the floor too long; the spoken-mode prompt already asks for brevity,
// this is the backstop.
const MAX_CHARS = 600;

export function ttsEnabled(): boolean {
  return !!PIPER_VOICE;
}

/** Synthesize `text` to a temp WAV and wrap it as an AudioResource. Rejects on
 *  a non-zero piper exit. Caller owns cleanup(). */
export async function synthesize(
  text: string,
): Promise<{ resource: AudioResource; cleanup: () => void }> {
  if (!PIPER_VOICE) throw new Error("PIPER_VOICE not set — TTS disabled.");
  const line = text.trim().slice(0, MAX_CHARS);
  if (!line) throw new Error("Nothing to say.");

  const outPath = join(tmpdir(), `barker-tts-${nanoid(10)}.wav`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(PIPER_BIN, ["--model", PIPER_VOICE, "--output_file", outPath]);
    let err = "";
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", reject); // e.g. binary not found
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`piper exited ${code}: ${err.trim().slice(0, 200)}`));
    });
    proc.stdin.write(line);
    proc.stdin.end();
  });

  const resource = createAudioResource(createReadStream(outPath), {
    inputType: StreamType.Arbitrary,
    inlineVolume: false,
  });
  const cleanup = () => void unlink(outPath).catch(() => {});
  return { resource, cleanup };
}
