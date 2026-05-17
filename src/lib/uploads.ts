import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";

export const UPLOADS_ROOT = "/var/lib/degenff/uploads";
export const URL_BASE = "/uploads";

/** Hard caps per file. */
const MAX_BYTES_BY_KIND: Record<string, number> = {
  image: 24 * 1024 * 1024,
  audio: 48 * 1024 * 1024,
  video: 60 * 1024 * 1024,
  other: 24 * 1024 * 1024,
};

/** MIMEs we accept verbatim. Everything else gets rejected. */
const ALLOWED: ReadonlySet<string> = new Set([
  // images
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  // audio
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac", "audio/x-wav",
  // video
  "video/mp4", "video/webm", "video/quicktime",
]);

export type StoredFile = {
  path: string;       // relative, e.g. "ab/abcd...jpg"
  url: string;        // "/uploads/ab/abcd...jpg"
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
};

function kindOf(mime: string): "image" | "audio" | "video" | "other" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

/**
 * Take a browser File from a multipart form, sniff its real MIME via magic
 * bytes, re-encode images (stripping EXIF), hash, and write to
 * /var/lib/degenff/uploads/<hash[0:2]>/<hash>.<ext>.
 */
export async function processUpload(file: File): Promise<StoredFile> {
  if (file.size === 0) throw new Error("Empty file");

  const initial = Buffer.from(await file.arrayBuffer());

  // 1. Magic-byte sniff. Do NOT trust file.type from the browser.
  const sniffed = await fileTypeFromBuffer(initial);
  if (!sniffed) throw new Error(`Cannot detect file type for ${file.name}`);
  const mime = sniffed.mime;
  let ext = sniffed.ext;
  if (!ALLOWED.has(mime)) throw new Error(`File type not allowed: ${mime}`);

  // 2. Size cap by kind
  const kind = kindOf(mime);
  const cap = MAX_BYTES_BY_KIND[kind];
  if (initial.length > cap) {
    throw new Error(`${file.name} is ${(initial.length / 1024 / 1024).toFixed(1)}MB; max ${(cap / 1024 / 1024).toFixed(0)}MB for ${kind}`);
  }

  // 3. Re-encode images (strips EXIF + sniffs polyglots) via sharp.
  //    GIF stays GIF (sharp would freeze the animation otherwise).
  let processed: Buffer = initial;
  let width: number | undefined;
  let height: number | undefined;
  if (kind === "image" && mime !== "image/gif") {
    const img = sharp(initial, { failOn: "none" });
    const meta = await img.metadata();
    width = meta.width ?? undefined;
    height = meta.height ?? undefined;
    if (mime === "image/png") {
      processed = await img.rotate().png({ compressionLevel: 9 }).toBuffer();
    } else if (mime === "image/webp") {
      processed = await img.rotate().webp({ quality: 88 }).toBuffer();
    } else if (mime === "image/avif") {
      processed = await img.rotate().avif({ quality: 60 }).toBuffer();
    } else {
      processed = await img.rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
      ext = "jpg";
    }
  } else if (mime === "image/gif") {
    const meta = await sharp(initial, { animated: true }).metadata();
    width = meta.width ?? undefined;
    height = meta.height ?? undefined;
  }

  // 4. Content-addressable hash
  const hash = crypto.createHash("sha256").update(processed).digest("hex");
  const prefix = hash.slice(0, 2);
  const relPath = path.posix.join(prefix, `${hash}.${ext}`);
  const absDir = path.join(UPLOADS_ROOT, prefix);
  const absFile = path.join(UPLOADS_ROOT, relPath);

  await fs.mkdir(absDir, { recursive: true, mode: 0o755 });
  // dedupe: if the file already exists with the same hash, skip write
  try {
    await fs.access(absFile);
  } catch {
    await fs.writeFile(absFile, processed, { mode: 0o644 });
  }

  return {
    path: relPath,
    url: `${URL_BASE}/${relPath}`,
    mime,
    bytes: processed.length,
    width,
    height,
  };
}
