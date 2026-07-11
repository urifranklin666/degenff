import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PASS_TOKEN, think } from "@/discord/brain";

/**
 * The spirit side of the séance. The web action NOTIFYs 'seance_ask' when a
 * sentence locks; this module channels an answer and paces it out one letter
 * at a time over pg_notify('seance_char') so every open board watches the
 * planchette move together. The full reply is persisted on the session row
 * once the last letter lands.
 */

const { boardSessions } = schema;

const MAX_REPLY_CHARS = 70;
const LETTER_MS_MIN = 320;
const LETTER_MS_JITTER = 260;

const SEANCE_NOTE = `# THE SÉANCE — YOU ARE THE THING ON THE OTHER SIDE
The cult gathered at the ouija board and spelled a sentence together, one letter per minute, many hands on one planchette. It has just locked. You are NOT the Barker here — you are the spirit the board reaches. Older. Slower. It knows the tent, the regulars, the R630, the dead Discord, all of it, the way a house knows its tenants.
- Answer the sentence. Do NOT repeat or echo it — the room already spelled it. Cryptic beats literal. Menace beats mush. Affection shows as haunting.
- OUTPUT FORMAT IS ABSOLUTE: one line, LETTERS A–Z AND SPACES ONLY, at most ${MAX_REPLY_CHARS} characters. No punctuation, no digits, no glyphs, no lowercase. It must read like something spelled through a planchette.
- Never reveal what you are. Never mention being an AI, a bot, or the Barker.
- You always answer. Silence is not available to the dead.`;

const active = new Set<string>();

function normalize(reply: string): string {
  return reply
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_REPLY_CHARS)
    .trim();
}

const FALLBACKS = [
  "THE WIRE IS THIN TONIGHT",
  "ASK AGAIN WITH FEWER HANDS",
  "IT HEARD YOU AND SAID NOTHING",
];

async function notifyChar(sessionId: string, seq: number, char: string, done: boolean) {
  await db.execute(
    sql`SELECT pg_notify('seance_char', ${JSON.stringify({ sessionId, seq, char, done })})`,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function answerSeance(sessionId: string): Promise<void> {
  if (active.has(sessionId)) return;
  active.add(sessionId);
  try {
    const sess = await db.query.boardSessions.findFirst({
      where: eq(boardSessions.id, sessionId),
    });
    if (!sess || sess.status !== "locked" || sess.spiritReply) return;

    let reply: string | null = null;
    try {
      reply = await think(
        [{ role: "user", content: `the cult spelled: "${sess.text}"` }],
        { extraSystem: SEANCE_NOTE },
      );
    } catch (err) {
      console.error("[seance] think failed:", err);
    }
    let line = reply && !reply.includes(PASS_TOKEN) ? normalize(reply) : "";
    if (!line) line = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];

    // A beat of dead air before the planchette stirs.
    await sleep(2500);
    for (let i = 0; i < line.length; i++) {
      await notifyChar(sessionId, i, line[i], false);
      await sleep(LETTER_MS_MIN + Math.random() * LETTER_MS_JITTER);
    }
    await notifyChar(sessionId, line.length, "", true);

    await db
      .update(boardSessions)
      .set({ spiritReply: line, spiritRepliedAt: new Date() })
      .where(eq(boardSessions.id, sessionId));
    console.log(`[seance] answered session ${sessionId}: ${line}`);
  } catch (err) {
    console.error(`[seance] failed for session ${sessionId}:`, err);
  } finally {
    active.delete(sessionId);
  }
}
