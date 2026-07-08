import { Client } from "pg";
import { brainEnabled, PASS_TOKEN, think, type BrainTurn } from "@/discord/brain";
import { getWireMessage, insertMessage, recentMessages } from "@/lib/rooms";
import { BARKER_USER_ID, type WireMessage } from "@/lib/rooms-shared";

/**
 * The Barker, rehomed — resident chat presence for the rooms (the self-hosted
 * platform that replaced the Discord). Separate Node process, same brain as
 * the old Discord layer: LISTENs on the room_messages insert trigger, decides
 * whether a message warrants a reply, and posts back as the seeded barker user
 * (which NOTIFYs the web process's SSE fanout like any other message).
 *
 * Gating mirrors converse.ts in spirit:
 *   addressed — message names the barker → always considered
 *   engaged   — barker spoke in this room recently → conversation continues
 *   otherwise — silence. Ambient chatter is not an invitation.
 */

const ADDRESSED_RE = /(?:^|\W)@?barker(?:\W|$)/i;
const ENGAGED_WINDOW_MS = 3 * 60_000;
const ROOM_COOLDOWN_MS = 4_000;
const CONTEXT_MESSAGES = 25;
const MSG_CLAMP = 700;

const ROOMS_NOTE = `# VENUE CHANGE — THE ROOMS
You are not on Discord anymore. Discord flatlined and the cult built its own chat: "the rooms", self-hosted at degeneratefuckface.com/rooms, on the same R630 as everything else. You live here now as a resident. Nobody can evict you again.
- Same persona, same regulars, same voice.
- This is plain text chat. No pings, no reactions, no threads, no markdown rendering. Don't use any of them.
- You have no tools this turn — just talk.
- If the latest message isn't worth answering, reply with exactly: [PASS]`;

type RoomState = {
  lastReplyAt: number;
  thinking: boolean;
  pendingId: string | null;
};

const roomState = new Map<string, RoomState>();

function stateFor(roomId: string): RoomState {
  let s = roomState.get(roomId);
  if (!s) {
    s = { lastReplyAt: 0, thinking: false, pendingId: null };
    roomState.set(roomId, s);
  }
  return s;
}

function shouldConsider(m: WireMessage, s: RoomState): boolean {
  if (m.author?.id === BARKER_USER_ID) return false;
  if (ADDRESSED_RE.test(m.body)) return true;
  return Date.now() - s.lastReplyAt < ENGAGED_WINDOW_MS;
}

async function gatherTurns(roomId: string): Promise<BrainTurn[]> {
  const history = await recentMessages(roomId, CONTEXT_MESSAGES);
  return history.map((m): BrainTurn =>
    m.author?.id === BARKER_USER_ID
      ? { role: "assistant", content: m.body.slice(0, MSG_CLAMP) }
      : { role: "user", content: `${m.author?.handle ?? "ghost"}: ${m.body.slice(0, MSG_CLAMP)}` },
  );
}

async function respond(roomId: string): Promise<void> {
  const s = stateFor(roomId);
  if (s.thinking) return;
  s.thinking = true;
  try {
    while (s.pendingId) {
      s.pendingId = null;
      const wait = s.lastReplyAt + ROOM_COOLDOWN_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));

      const turns = await gatherTurns(roomId);
      if (turns.length === 0) return;

      const reply = await think(turns, { extraSystem: ROOMS_NOTE });
      if (!reply || reply.includes(PASS_TOKEN)) continue;

      await insertMessage({ roomId, userId: BARKER_USER_ID, body: reply.slice(0, 2000) });
      s.lastReplyAt = Date.now();
    }
  } catch (err) {
    console.error(`[barker] respond failed in room ${roomId}:`, err);
  } finally {
    s.thinking = false;
  }
}

async function listen(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    application_name: "degenff-rooms-barker",
  });

  client.on("notification", async (n) => {
    if (n.channel !== "room_msg" || !n.payload) return;
    try {
      const { id, roomId } = JSON.parse(n.payload) as { id: string; roomId: string };
      const wire = await getWireMessage(id);
      if (!wire) return;
      const s = stateFor(roomId);
      if (!shouldConsider(wire, s)) return;
      s.pendingId = id;
      void respond(roomId);
    } catch (err) {
      console.error("[barker] notification handling failed:", err);
    }
  });

  // systemd (Restart=always) owns recovery — a broken listener is fatal here.
  client.on("error", (err) => {
    console.error("[barker] pg listener error — exiting for restart:", err.message);
    process.exit(1);
  });

  await client.connect();
  await client.query("LISTEN room_msg");
  return client;
}

async function main() {
  if (!brainEnabled()) {
    console.error("[barker] ANTHROPIC_API_KEY is not set — the barker has nothing to think with.");
    process.exit(1);
  }

  const client = await listen();
  console.log("[barker] resident in the rooms — listening on room_msg");

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[barker] ${signal} received — leaving the rooms`);
    setTimeout(() => process.exit(0), 5000).unref();
    client.end().finally(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[barker] fatal:", err);
  process.exit(1);
});
