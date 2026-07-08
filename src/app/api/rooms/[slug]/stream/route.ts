import { auth } from "@/auth";
import { getRoomBySlug } from "@/lib/rooms";
import {
  ensureListening,
  joinPresence,
  onPresence,
  onRoomMessage,
  presenceSnapshot,
} from "@/lib/rooms-live";

export const dynamic = "force-dynamic";

const PING_MS = 25_000;

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("sign in", { status: 401 });

  const { slug } = await ctx.params;
  const room = await getRoomBySlug(slug);
  if (!room) return new Response("no such room", { status: 404 });
  const role = session.user.role;
  if (room.modOnly && role !== "mod" && role !== "admin") {
    return new Response("mods only", { status: 403 });
  }

  await ensureListening();

  const user = {
    userId: session.user.id,
    handle: session.user.handle ?? "anon",
    image: session.user.image ?? null,
  };

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

      const offMsg = onRoomMessage(room.id, (m) => send("msg", m));
      const offPresence = onPresence(room.id, (list) => send("presence", list));
      const leave = joinPresence(room.id, user);
      const ping = setInterval(() => write(`: ping\n\n`), PING_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        offMsg();
        offPresence();
        leave();
        try {
          controller.close();
        } catch {
          // already closed by the peer
        }
      };

      send("presence", presenceSnapshot(room.id));
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
