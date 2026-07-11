export const dynamic = "force-dynamic";

const STATION = `http://127.0.0.1:${process.env.RADIO_PORT ?? 3847}`;

/** Relay the station's live MP3 out through the app (and the tunnel).
 * The station itself only listens on loopback. */
export async function GET(req: Request) {
  let upstream: Response;
  try {
    upstream = await fetch(`${STATION}/stream`, { signal: req.signal });
  } catch {
    return new Response("transmitter down", { status: 503 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("transmitter down", { status: 503 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache, no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
