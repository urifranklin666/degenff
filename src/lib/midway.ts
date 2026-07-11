import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export {
  WHEEL_WEDGES,
  drawScratchCard,
  pullFromJar,
  type WheelWedge,
  type ScratchOutcome,
  type ToothOutcome,
} from "@/lib/midway-shared";

/* ── claims ledger ───────────────────────────────────────────────────── */

export type LedgerEntry = {
  handle: string;
  kind: string;
  label: string;
  source: string;
  createdAt: string;
};

export async function recentClaims(limit = 20): Promise<LedgerEntry[]> {
  const rows = await db
    .select({
      handle: schema.users.handle,
      kind: schema.userAwards.kind,
      label: schema.userAwards.label,
      source: schema.userAwards.source,
      createdAt: schema.userAwards.createdAt,
    })
    .from(schema.userAwards)
    .innerJoin(schema.users, eq(schema.userAwards.userId, schema.users.id))
    .orderBy(desc(schema.userAwards.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    handle: r.handle,
    kind: r.kind,
    label: r.label,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
  }));
}
