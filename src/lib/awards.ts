import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";

const { userAwards } = schema;

export type AwardSource =
  | "midway-wheel"
  | "midway-scratch"
  | "midway-tooth"
  | "barker"
  | "seance"
  | "bureau";

export type AwardWire = {
  id: string;
  kind: "stamp" | "title";
  label: string;
  flavor: string | null;
  source: string;
  createdAt: string;
};

export async function grantAward(opts: {
  userId: string;
  kind: "stamp" | "title";
  label: string;
  flavor?: string;
  source: AwardSource;
}): Promise<AwardWire> {
  const [row] = await db
    .insert(userAwards)
    .values({
      userId: opts.userId,
      kind: opts.kind,
      label: opts.label.slice(0, 64),
      flavor: opts.flavor?.slice(0, 200),
      source: opts.source,
    })
    .returning();
  return toWire(row);
}

export async function awardsForUser(userId: string, limit = 100): Promise<AwardWire[]> {
  const rows = await db.query.userAwards.findMany({
    where: eq(userAwards.userId, userId),
    orderBy: [desc(userAwards.createdAt)],
    limit,
  });
  return rows.map(toWire);
}

/** Batch lookup for the rooms roster: latest title per user, stamp count. */
export async function awardBadges(
  userIds: string[],
): Promise<Map<string, { title: string | null; stamps: number }>> {
  const out = new Map<string, { title: string | null; stamps: number }>();
  if (userIds.length === 0) return out;
  const rows = await db.query.userAwards.findMany({
    where: inArray(userAwards.userId, userIds),
    orderBy: [desc(userAwards.createdAt)],
  });
  for (const r of rows) {
    let entry = out.get(r.userId);
    if (!entry) {
      entry = { title: null, stamps: 0 };
      out.set(r.userId, entry);
    }
    if (r.kind === "title" && !entry.title) entry.title = r.label;
    if (r.kind === "stamp") entry.stamps += 1;
  }
  return out;
}

function toWire(row: typeof userAwards.$inferSelect): AwardWire {
  return {
    id: row.id,
    kind: row.kind === "title" ? "title" : "stamp",
    label: row.label,
    flavor: row.flavor,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}
