import { ensureListening, onSeance } from "@/lib/rooms-live";

export const dynamic = "force-dynamic";

const PING_MS = 25_000;

/** Public SSE feed of planchette movements — anyone may watch the séance;
 * only the signed-in may touch the board. */
export async function GET(req: Request) {
  await ensureListening();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const send = (event: string, data: unknown) =>
        write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      const offSeance = onSeance((e) => send("spirit", e));
      const ping = setInterval(() => write(`: ping\n\n`), PING_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        offSeance();
        try {
          controller.close();
        } catch {
          // already closed by the peer
        }
      };

      write(`: the wire is warm\n\n`);
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
