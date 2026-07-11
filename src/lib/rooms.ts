import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { awardBadges } from "@/lib/awards";
import { HISTORY_LIMIT, type RoomSummary, type WireMessage } from "@/lib/rooms-shared";

const { rooms, roomMessages } = schema;

export { BARKER_USER_ID, HISTORY_LIMIT, MAX_MESSAGE_CHARS } from "@/lib/rooms-shared";
export type { RoomSummary, WireMessage } from "@/lib/rooms-shared";

export async function listRooms(opts: { includeModOnly: boolean }): Promise<RoomSummary[]> {
  const all = await db.query.rooms.findMany({
    orderBy: (r, { asc }) => [asc(r.position), asc(r.slug)],
  });
  return all
    .filter((r) => opts.includeModOnly || !r.modOnly)
    .map((r) => ({ id: r.id, slug: r.slug, name: r.name, topic: r.topic, modOnly: r.modOnly }));
}

export async function getRoomBySlug(slug: string) {
  return db.query.rooms.findFirst({ where: eq(rooms.slug, slug) });
}

function toWire(
  row: {
    id: string;
    roomId: string;
    body: string;
    createdAt: Date;
    author: { id: string; handle: string; name: string | null; image: string | null; role: string } | null;
  },
  title: string | null,
): WireMessage {
  return {
    id: row.id,
    roomId: row.roomId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    author: row.author
      ? {
          id: row.author.id,
          handle: row.author.handle,
          name: row.author.name,
          image: row.author.image,
          role: row.author.role,
          title,
        }
      : null,
  };
}

/** Last N non-deleted messages, oldest first (render order). */
export async function recentMessages(roomId: string, limit = HISTORY_LIMIT): Promise<WireMessage[]> {
  const rows = await db.query.roomMessages.findMany({
    where: and(eq(roomMessages.roomId, roomId), isNull(roomMessages.deletedAt)),
    orderBy: [desc(roomMessages.createdAt)],
    limit,
    with: { author: true },
  });
  const authorIds = [...new Set(rows.map((r) => r.author?.id).filter((x): x is string => !!x))];
  const badges = await awardBadges(authorIds);
  return rows.reverse().map((r) => toWire(r, r.author ? badges.get(r.author.id)?.title ?? null : null));
}

/** Fetch one message in wire shape — used by the SSE fanout on NOTIFY. */
export async function getWireMessage(id: string): Promise<WireMessage | null> {
  const row = await db.query.roomMessages.findFirst({
    where: and(eq(roomMessages.id, id), isNull(roomMessages.deletedAt)),
    with: { author: true },
  });
  if (!row) return null;
  const badges = row.author ? await awardBadges([row.author.id]) : new Map();
  return toWire(row, row.author ? badges.get(row.author.id)?.title ?? null : null);
}

/** Insert a message. The DB trigger NOTIFYs every listening process. */
export async function insertMessage(opts: {
  roomId: string;
  userId: string;
  body: string;
}): Promise<WireMessage> {
  const [row] = await db
    .insert(roomMessages)
    .values({ roomId: opts.roomId, userId: opts.userId, body: opts.body })
    .returning();
  const wire = await getWireMessage(row.id);
  if (!wire) throw new Error("message vanished between insert and read");
  return wire;
}
