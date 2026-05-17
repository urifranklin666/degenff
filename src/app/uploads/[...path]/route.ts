import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";

const ROOT = "/var/lib/degenff/uploads";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

/**
 * Dev/single-host fallback for serving uploaded files. In a fronted-by-Caddy
 * production layout, Caddy can serve /uploads/* directly from disk and this
 * route is never hit.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  // safe-join: reject any path traversal
  const rel = parts.join("/");
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) {
    return new NextResponse("nope", { status: 400 });
  }

  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
  if (!stat.isFile()) return new NextResponse("not found", { status: 404 });

  const body = await fs.readFile(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";

  return new NextResponse(body as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": mime,
      "content-length": String(stat.size),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
