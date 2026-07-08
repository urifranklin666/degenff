"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { consumeRateLimit, formatRetryAfter } from "@/lib/ratelimit";
import { getRoomBySlug, insertMessage, MAX_MESSAGE_CHARS, type WireMessage } from "@/lib/rooms";

const { users } = schema;

const BodySchema = z
  .string()
  .transform((s) => s.replace(/\r\n/g, "\n").trim())
  .pipe(z.string().min(1, "say something").max(MAX_MESSAGE_CHARS, "too long. this is a chat, not a feat."));

export type PostMessageResult =
  | { ok: true; message: WireMessage }
  | { ok: false; error: string };

export async function postRoomMessage(roomSlug: string, rawBody: string): Promise<PostMessageResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "sign in to speak." };

  // Session role can be stale; re-read the user like the bot's requireMod does.
  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  if (!user) return { ok: false, error: "no record of you. sign in again." };
  if (user.banned) return { ok: false, error: "you are banned. the room can see you, but it cannot hear you." };

  const room = await getRoomBySlug(roomSlug);
  if (!room) return { ok: false, error: "that room does not exist." };
  if (room.modOnly && user.role !== "mod" && user.role !== "admin") {
    return { ok: false, error: "mods only in there." };
  }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid message." };
  }

  const limit = await consumeRateLimit({
    key: `room-msg:${user.id}`,
    max: 10,
    windowMs: 15_000,
  });
  if (!limit.ok) {
    return { ok: false, error: `easy. breathe. try again in ${formatRetryAfter(limit.retryAfterSec)}.` };
  }

  const message = await insertMessage({ roomId: room.id, userId: user.id, body: parsed.data });
  return { ok: true, message };
}
