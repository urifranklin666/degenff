import { sql } from "drizzle-orm";
import { db } from "@/db";

export type WeeklyStats = {
  windowStart: string;
  windowEnd: string;
  approve: number;
  feature: number;
  reject: number;
  withdraw: number;
  unfeature: number;
  rejectionReasons: Array<{ reason: string; n: number }>;
  topContributors: Array<{ handle: string; n: number }>;
};

const WINDOW_MS = 7 * 24 * 3600 * 1000;

/** Last 7 days of mod activity, redacted to counts only. Public-safe. */
export async function getWeeklyStats(): Promise<WeeklyStats> {
  const now = new Date();
  const start = new Date(now.getTime() - WINDOW_MS);

  const actions = await db.execute<{ action: string; n: string }>(sql`
    SELECT action::text AS action, COUNT(*)::text AS n
    FROM mod_actions
    WHERE created_at >= ${start.toISOString()}
    GROUP BY action
  `);

  const counts: Record<string, number> = {
    approve: 0, feature: 0, reject: 0, withdraw: 0, unfeature: 0, edit: 0,
  };
  for (const r of actions.rows ?? []) {
    counts[r.action] = Number(r.n) || 0;
  }

  const reasons = await db.execute<{ reason: string | null; n: string }>(sql`
    SELECT s.rejection_reason AS reason, COUNT(*)::text AS n
    FROM submissions s
    WHERE s.status = 'rejected'
      AND s.decided_at >= ${start.toISOString()}
      AND s.rejection_reason IS NOT NULL
    GROUP BY s.rejection_reason
    ORDER BY n DESC
    LIMIT 8
  `);

  const contributors = await db.execute<{ handle: string; n: string }>(sql`
    SELECT u.handle AS handle, COUNT(*)::text AS n
    FROM submissions s
    JOIN users u ON u.id = s.user_id
    WHERE s.status = 'approved'
      AND s.decided_at >= ${start.toISOString()}
    GROUP BY u.handle
    ORDER BY n DESC
    LIMIT 8
  `);

  return {
    windowStart: start.toISOString(),
    windowEnd: now.toISOString(),
    approve:   counts.approve,
    feature:   counts.feature,
    reject:    counts.reject,
    withdraw:  counts.withdraw,
    unfeature: counts.unfeature,
    rejectionReasons: (reasons.rows ?? []).map((r) => ({
      reason: (r.reason ?? "").slice(0, 200),
      n: Number(r.n) || 0,
    })),
    topContributors: (contributors.rows ?? []).map((r) => ({
      handle: r.handle,
      n: Number(r.n) || 0,
    })),
  };
}
