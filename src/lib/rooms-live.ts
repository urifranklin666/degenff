import { EventEmitter } from "node:events";
import { Client } from "pg";
import { getWireMessage, type WireMessage } from "@/lib/rooms";

/**
 * Realtime spine for the rooms. One dedicated pg connection per process
 * LISTENs on 'room_msg' (fired by the room_messages insert trigger), fetches
 * the row once, and fans it out to every subscribed SSE connection via an
 * EventEmitter. Works across processes — web and barker each run their own
 * listener against the same Postgres.
 *
 * Presence is in-memory per web process (we run exactly one), refreshed by
 * SSE connect/disconnect. Nothing about presence touches the DB.
 */

export type PresenceEntry = { userId: string; handle: string; image: string | null };

type Live = {
  emitter: EventEmitter;
  starting: Promise<void> | null;
  client: Client | null;
  presence: Map<string, Map<string, PresenceEntry & { conns: number }>>;
};

declare global {
  var __degenff_rooms_live: Live | undefined;
}

function getLive(): Live {
  if (!globalThis.__degenff_rooms_live) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    globalThis.__degenff_rooms_live = { emitter, starting: null, client: null, presence: new Map() };
  }
  return globalThis.__degenff_rooms_live;
}

async function connect(live: Live): Promise<void> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    application_name: "degenff-rooms-listen",
  });

  client.on("notification", async (n) => {
    if (n.channel !== "room_msg" || !n.payload) return;
    try {
      const { id, roomId } = JSON.parse(n.payload) as { id: string; roomId: string };
      const wire = await getWireMessage(id);
      if (wire) live.emitter.emit(`msg:${roomId}`, wire);
    } catch {
      // malformed payload or fetch race — drop it, history catches up on reload
    }
  });

  client.on("error", () => scheduleReconnect(live));
  client.on("end", () => scheduleReconnect(live));

  await client.connect();
  await client.query("LISTEN room_msg");
  live.client = client;
}

function scheduleReconnect(live: Live) {
  if (live.client) {
    live.client.removeAllListeners();
    live.client.end().catch(() => {});
    live.client = null;
  }
  live.starting = null;
  setTimeout(() => {
    ensureListening().catch(() => {});
  }, 3000);
}

/** Idempotent: first caller connects, everyone else reuses the connection. */
export async function ensureListening(): Promise<void> {
  const live = getLive();
  if (live.client) return;
  if (!live.starting) {
    live.starting = connect(live).catch((err) => {
      live.starting = null;
      throw err;
    });
  }
  return live.starting;
}

export function onRoomMessage(roomId: string, fn: (m: WireMessage) => void): () => void {
  const live = getLive();
  live.emitter.on(`msg:${roomId}`, fn);
  return () => live.emitter.off(`msg:${roomId}`, fn);
}

export function onPresence(roomId: string, fn: (list: PresenceEntry[]) => void): () => void {
  const live = getLive();
  live.emitter.on(`presence:${roomId}`, fn);
  return () => live.emitter.off(`presence:${roomId}`, fn);
}

export function presenceSnapshot(roomId: string): PresenceEntry[] {
  const room = getLive().presence.get(roomId);
  if (!room) return [];
  return [...room.values()].map(({ userId, handle, image }) => ({ userId, handle, image }));
}

function broadcastPresence(roomId: string) {
  getLive().emitter.emit(`presence:${roomId}`, presenceSnapshot(roomId));
}

/** Register a connection; returns the matching leave function. */
export function joinPresence(roomId: string, entry: PresenceEntry): () => void {
  const live = getLive();
  let room = live.presence.get(roomId);
  if (!room) {
    room = new Map();
    live.presence.set(roomId, room);
  }
  const existing = room.get(entry.userId);
  if (existing) {
    existing.conns += 1;
  } else {
    room.set(entry.userId, { ...entry, conns: 1 });
    broadcastPresence(roomId);
  }

  let left = false;
  return () => {
    if (left) return;
    left = true;
    const current = room.get(entry.userId);
    if (!current) return;
    current.conns -= 1;
    if (current.conns <= 0) {
      room.delete(entry.userId);
      broadcastPresence(roomId);
    }
  };
}
