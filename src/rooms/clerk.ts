import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { brainEnabled, think } from "@/discord/brain";
import { grantAward } from "@/lib/awards";
import { bureauFormByCode } from "@/lib/bureau-shared";

/**
 * The clerk — the Barker in a different hat. The web action NOTIFYs
 * 'bureau_filed' when a form lands; this module lets it age in the tray for
 * a bureaucratically satisfying delay, then rules on it. Approval mints a
 * PERMIT stamp. Denial is its own reward. Some filings are simply lost.
 */

const { bureauFilings, users } = schema;

const MIN_DELAY_MS = Number(process.env.BUREAU_MIN_DELAY_MS ?? 60_000);
const MAX_DELAY_MS = Number(process.env.BUREAU_MAX_DELAY_MS ?? 8 * 60_000);
const LOST_RATE = 0.05;

const CLERK_NOTE = `# THE BUREAU — YOU ARE THE CLERK
You are the Barker wearing the clerk's visor. A resident filed a form. Rule on it.
- Read the form code, its purpose, and the applicant's plea. Judge it the way a tired municipal clerk in a haunted carnival would: procedural, dry, occasionally merciful, never impressed.
- Approve pleas with effort, wit, or pathos. Deny lazy ones, or approve them for the wrong reason. Arbitrary is fine; the bureau is not a court.
- OUTPUT FORMAT IS ABSOLUTE: exactly one line, starting with APPROVED or DENIED, then " :: ", then your ruling note in the house voice (max 180 chars). Example:
APPROVED :: the loitering described meets code. proceed to stand around.
- Never mention being an AI. Never break the clerk.`;

const CANNED_APPROVED = "processed without reading. the stamp was already wet.";
const CANNED_DENIED = "denied pending form 12-C, which does not exist.";
const LOST_NOTE = "the filing could not be located. it was here a minute ago. condolences.";

const active = new Set<string>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function processFiling(filingId: string): Promise<void> {
  if (active.has(filingId)) return;
  active.add(filingId);
  try {
    const filing = await db.query.bureauFilings.findFirst({
      where: eq(bureauFilings.id, filingId),
    });
    if (!filing || filing.status !== "received") return;

    await db
      .update(bureauFilings)
      .set({ status: "under_review" })
      .where(eq(bureauFilings.id, filingId));

    // The tray. Nothing moves quickly here on purpose.
    await sleep(MIN_DELAY_MS + Math.random() * Math.max(0, MAX_DELAY_MS - MIN_DELAY_MS));

    if (Math.random() < LOST_RATE) {
      await db
        .update(bureauFilings)
        .set({ status: "lost", clerkNote: LOST_NOTE, decidedAt: new Date() })
        .where(eq(bureauFilings.id, filingId));
      console.log(`[clerk] lost filing ${filingId}`);
      return;
    }

    const applicant = await db.query.users.findFirst({ where: eq(users.id, filing.userId) });
    const form = bureauFormByCode(filing.formCode);

    let verdict: "approved" | "denied" = Math.random() < 0.6 ? "approved" : "denied";
    let note = verdict === "approved" ? CANNED_APPROVED : CANNED_DENIED;

    if (brainEnabled()) {
      try {
        const reply = await think(
          [
            {
              role: "user",
              content: [
                `FORM ${filing.formCode} — ${form?.title ?? "UNKNOWN FORM"}`,
                `purpose: ${form?.blurb ?? "unknown"}`,
                `applicant: @${applicant?.handle ?? "anon"}`,
                `plea: "${filing.body.slice(0, 600)}"`,
              ].join("\n"),
            },
          ],
          { extraSystem: CLERK_NOTE },
        );
        const m = reply?.match(/^\s*(APPROVED|DENIED)\s*::\s*(.{1,300})/im);
        if (m) {
          verdict = m[1].toUpperCase() === "APPROVED" ? "approved" : "denied";
          note = m[2].trim().slice(0, 200);
        }
      } catch (err) {
        console.error("[clerk] think failed:", err);
      }
    }

    let stampLabel: string | null = null;
    if (verdict === "approved") {
      stampLabel = `PERMIT ${filing.formCode}`;
      await grantAward({
        userId: filing.userId,
        kind: "stamp",
        label: stampLabel,
        flavor: note,
        source: "bureau",
      });
    }

    await db
      .update(bureauFilings)
      .set({ status: verdict, clerkNote: note, stampLabel, decidedAt: new Date() })
      .where(eq(bureauFilings.id, filingId));
    console.log(`[clerk] ${verdict} filing ${filingId} (${filing.formCode})`);
  } catch (err) {
    console.error(`[clerk] failed for filing ${filingId}:`, err);
  } finally {
    active.delete(filingId);
  }
}
