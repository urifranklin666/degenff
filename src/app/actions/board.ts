"use server";

import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { consumeRateLimit, formatRetryAfter } from "@/lib/ratelimit";
import { notifyBoardLocked } from "@/discord/notify";
import {
  MAX_CHARS,
  PER_USER_COOLDOWN_SEC,
  type BoardSnapshot,
  type LetterAction,
  type SubmitLetterResult,
} from "@/lib/board";

const { boardSessions, boardLetters, users } = schema;

const LETTER_RE = /^[A-Z]$/;

async function getOrCreateLiveSession() {
  const existing = await db.query.boardSessions.findFirst({
    where: eq(boardSessions.status, "live"),
    orderBy: desc(boardSessions.startedAt),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(boardSessions)
    .values({ text: "", status: "live" })
    .returning();
  return created;
}

async function loadSnapshot(userId?: string): Promise<BoardSnapshot> {
  const live = await getOrCreateLiveSession();
  const letters = await db
    .select({ userId: boardLetters.userId, handle: users.handle, image: users.image })
    .from(boardLetters)
    .innerJoin(users, eq(boardLetters.userId, users.id))
    .where(eq(boardLetters.sessionId, live.id));

  // Tally contributors in order of first appearance
  const order: string[] = [];
  const tally = new Map<string, { handle: string; image: string | null; count: number }>();
  for (const row of letters) {
    const entry = tally.get(row.userId);
    if (entry) {
      entry.count += 1;
    } else {
      order.push(row.userId);
      tally.set(row.userId, { handle: row.handle, image: row.image, count: 1 });
    }
  }
  const contributors = order.map((id) => tally.get(id)!);

  // Last 5 locked sentences with their co-signers
  const lockedRows = await db
    .select()
    .from(boardSessions)
    .where(eq(boardSessions.status, "locked"))
    .orderBy(desc(boardSessions.lockedAt))
    .limit(5);

  const recent: BoardSnapshot["recent"] = [];
  for (const r of lockedRows) {
    if (!r.lockedAt) continue;
    const coRows = await db
      .select({ handle: users.handle, userId: boardLetters.userId })
      .from(boardLetters)
      .innerJoin(users, eq(boardLetters.userId, users.id))
      .where(eq(boardLetters.sessionId, r.id));
    const seen = new Set<string>();
    const cosigners: string[] = [];
    for (const c of coRows) {
      if (seen.has(c.userId)) continue;
      seen.add(c.userId);
      cosigners.push(c.handle);
    }
    recent.push({
      id: r.id,
      text: r.text,
      lockedAt: r.lockedAt.toISOString(),
      contributors: cosigners,
      spiritReply: r.spiritReply,
    });
  }

  let remainingCooldownSec = 0;
  if (userId) {
    const last = await db
      .select({ at: boardLetters.at })
      .from(boardLetters)
      .where(and(eq(boardLetters.sessionId, live.id), eq(boardLetters.userId, userId)))
      .orderBy(desc(boardLetters.at))
      .limit(1);
    if (last[0]?.at) {
      const elapsed = (Date.now() - last[0].at.getTime()) / 1000;
      remainingCooldownSec = Math.max(0, Math.ceil(PER_USER_COOLDOWN_SEC - elapsed));
    }
  }

  return {
    sessionId: live.id,
    text: live.text,
    status: live.status,
    startedAt: live.startedAt.toISOString(),
    contributors,
    recent,
    remainingCooldownSec,
  };
}

export async function getBoardSnapshot(): Promise<BoardSnapshot> {
  const session = await auth();
  return loadSnapshot(session?.user?.id);
}

export async function submitLetter(input: LetterAction): Promise<SubmitLetterResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to touch the planchette." };
  }
  if (session.user.role === "visitor") {
    return { ok: false, error: "Banned hands stay off the board." };
  }

  // Validate the input
  let writeChar: string;
  let isDelete = false;
  if (input.kind === "delete") {
    isDelete = true;
    writeChar = "<DEL>";
  } else if (input.kind === "space") {
    writeChar = " ";
  } else if (input.kind === "letter" && LETTER_RE.test(input.char)) {
    writeChar = input.char;
  } else {
    return { ok: false, error: "Letters A–Z, space, or delete only." };
  }

  // Per-user cooldown (60s). One letter per minute, per person.
  const rl = await consumeRateLimit({
    key: `board:${session.user.id}`,
    max: 1,
    windowMs: PER_USER_COOLDOWN_SEC * 1000,
  });
  if (!rl.ok) {
    const snapshot = await loadSnapshot(session.user.id);
    return {
      ok: false,
      error: `Wait ${formatRetryAfter(rl.retryAfterSec)} before the next letter.`,
      snapshot,
    };
  }

  // Operate on the current live session
  const live = await getOrCreateLiveSession();
  if (live.status !== "live") {
    return { ok: false, error: "Board is mid-lock. Try again in a second." };
  }

  let newText = live.text;
  if (isDelete) {
    if (newText.length === 0) {
      // Refund the rate-limit slot conceptually by just noting; counter will reset on its own.
      const snapshot = await loadSnapshot(session.user.id);
      return { ok: false, error: "Nothing to erase.", snapshot };
    }
    newText = newText.slice(0, -1);
  } else {
    if (newText.length >= MAX_CHARS) {
      return { ok: false, error: "The sentence is full." };
    }
    newText = newText + writeChar;
  }

  // Persist letter + updated session text. We record the action even for deletes
  // so the contributor list reflects everyone who touched the planchette.
  await db.insert(boardLetters).values({
    sessionId: live.id,
    userId: session.user.id,
    char: writeChar,
  });

  const shouldLock = !isDelete && newText.length >= MAX_CHARS;
  if (shouldLock) {
    await db
      .update(boardSessions)
      .set({ text: newText, status: "locked", lockedAt: new Date() })
      .where(eq(boardSessions.id, live.id));
  } else {
    await db
      .update(boardSessions)
      .set({ text: newText })
      .where(eq(boardSessions.id, live.id));
  }

  if (shouldLock) {
    // Summon the spirit: the barker process LISTENs on seance_ask and answers
    // through the planchette. Best-effort — a mute spirit is still a séance.
    try {
      await db.execute(
        sql`SELECT pg_notify('seance_ask', ${JSON.stringify({ sessionId: live.id })})`,
      );
    } catch (err) {
      console.error("[board] seance_ask notify failed:", err);
    }
    // Best-effort Discord post + start the next session.
    try {
      await notifyBoardLocked(live.id);
    } catch (err) {
      console.error("[board] notifyBoardLocked failed:", err);
    }
    await db.insert(boardSessions).values({ text: "", status: "live" });
  }

  revalidatePath("/board");
  const snapshot = await loadSnapshot(session.user.id);
  return { ok: true, snapshot };
}
