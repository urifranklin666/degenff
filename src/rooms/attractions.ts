import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { brainEnabled, think, type VenueTools } from "@/discord/brain";
import { grantAward } from "@/lib/awards";
import { consumeRateLimit } from "@/lib/ratelimit";
import { getRoomBySlug, insertMessage } from "@/lib/rooms";
import { BARKER_USER_ID } from "@/lib/rooms-shared";

/**
 * The Barker holds the keys now. Two powers:
 *   - grant_stamp: a venue tool the rooms conversation can fire — the Barker
 *     pins a stamp or title to a resident's record when the moment earns it.
 *     Hard-capped at 5 grants/day across everyone so it stays an event.
 *   - tonight's attraction: one post a night in the lobby announcing what the
 *     tent is doing after dark. The séance gets top billing.
 */

const { users } = schema;

const GRANTS_PER_DAY = 5;
const DAY_MS = 24 * 3600 * 1000;

export function barkerVenueTools(): VenueTools {
  return {
    tools: [
      {
        name: "grant_stamp",
        description:
          "Pin a stamp (or, rarely, a title) to a resident's public record. Use it when someone in the room genuinely earns a decoration — a great bit, a confession, a feat of idiocy. It is a big deal; at most a few per day exist. label: short, uppercase, house voice (e.g. 'SAID THE QUIET PART'). kind: 'stamp' almost always; 'title' only for something legendary.",
        input_schema: {
          type: "object",
          properties: {
            handle: { type: "string", description: "The resident's @handle, without the @." },
            label: { type: "string", description: "Uppercase stamp text, max 64 chars." },
            flavor: { type: "string", description: "One dry line of citation, max 200 chars." },
            kind: { type: "string", enum: ["stamp", "title"] },
          },
          required: ["handle", "label"],
        },
      },
    ],
    execute: async (name, input) => {
      if (name !== "grant_stamp") return JSON.stringify({ error: `unknown tool: ${name}` });
      const handle = typeof input.handle === "string" ? input.handle.replace(/^@/, "").trim() : "";
      const label = typeof input.label === "string" ? input.label.trim().toUpperCase() : "";
      if (!handle || !label) return JSON.stringify({ error: "handle and label required" });

      const rl = await consumeRateLimit({
        key: "barker:grants",
        max: GRANTS_PER_DAY,
        windowMs: DAY_MS,
      });
      if (!rl.ok) {
        return JSON.stringify({ error: "the stamp drawer is empty until tomorrow — say so in character" });
      }

      const target = await db.query.users.findFirst({ where: eq(users.handle, handle) });
      if (!target || target.id === BARKER_USER_ID) {
        return JSON.stringify({ error: `no resident with handle @${handle}` });
      }
      if (target.banned) {
        return JSON.stringify({ error: "banned hands take no stamps" });
      }

      const award = await grantAward({
        userId: target.id,
        kind: input.kind === "title" ? "title" : "stamp",
        label,
        flavor: typeof input.flavor === "string" ? input.flavor : undefined,
        source: "barker",
      });
      return JSON.stringify({ ok: true, granted: award.label, to: `@${handle}`, kind: award.kind });
    },
  };
}

/* ── tonight's attraction ────────────────────────────────────────────── */

const ATTRACTION_HOUR_UTC = Number(process.env.BARKER_ATTRACTION_HOUR_UTC ?? 21);
const ATTRACTION_ROOM = process.env.BARKER_ATTRACTION_ROOM ?? "lobby";

const ATTRACTION_NOTE = `# TONIGHT'S ATTRACTION — YOUR NIGHTLY POST
It's your hour. Post ONE short announcement (2-4 sentences max) to the lobby naming tonight's attraction. Rotate through the tent's real offerings — the séance at the board (/board — the room spells a question one letter a minute and the other side answers), the midway (/midway — daily wheel spin, scratch cards, the tooth jar), the radio (/radio — always on), the bureau (/bureau — file a form, be processed). Pick ONE to headline tonight and sell it like a carnival barker who lives here. Plain text, no markdown.`;

const CANNED = [
  "tonight's attraction: the séance. the board is warm and the other side is chatty. bring one letter and your patience. /board",
  "tonight's attraction: the midway. the wheel turns once per soul per day and it has been thinking about you. /midway",
  "tonight's attraction: the bureau. file a form. be processed. the clerk is in a mood, which is good for approvals or very bad. /bureau",
  "tonight's attraction: the radio. it has been playing all day whether or not anyone listened. someone should listen. /radio",
];

let lastPostKey = "";

async function postAttraction(): Promise<void> {
  const room = await getRoomBySlug(ATTRACTION_ROOM);
  if (!room) return;

  let line: string | null = null;
  if (brainEnabled()) {
    try {
      line = await think(
        [{ role: "user", content: "the hour has arrived. post tonight's attraction." }],
        { extraSystem: ATTRACTION_NOTE },
      );
    } catch (err) {
      console.error("[attractions] think failed:", err);
    }
  }
  if (!line) line = CANNED[Math.floor(Math.random() * CANNED.length)];

  await insertMessage({ roomId: room.id, userId: BARKER_USER_ID, body: line.slice(0, 2000) });
  console.log("[attractions] posted tonight's attraction");
}

export function startAttractions(): void {
  setInterval(() => {
    const now = new Date();
    if (now.getUTCHours() !== ATTRACTION_HOUR_UTC) return;
    const key = now.toISOString().slice(0, 10);
    if (lastPostKey === key) return;
    lastPostKey = key;
    postAttraction().catch((err) => console.error("[attractions] post failed:", err));
  }, 60_000);
  console.log(`[attractions] nightly post armed · ${String(ATTRACTION_HOUR_UTC).padStart(2, "0")}:00 UTC in #${ATTRACTION_ROOM}`);
}
