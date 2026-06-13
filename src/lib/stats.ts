import { sql } from "drizzle-orm";
import { db } from "@/db";

export type SiteStats = {
  submissions: number;
  feats: number;
  featured: number;
  contributors: number;
};

/**
 * Live hero counts. Returns null on any DB failure so the homepage can
 * fall back to its lying placeholder numbers instead of 500ing.
 */
export async function getSiteStats(): Promise<SiteStats | null> {
  try {
    const r = await db.execute<{
      subs: string;
      feats: string;
      featured: string;
      contributors: string;
    }>(sql`
      SELECT
        (SELECT COUNT(*) FROM submissions WHERE status = 'approved')                    AS subs,
        (SELECT COUNT(*) FROM feats WHERE status = 'approved')                          AS feats,
        (SELECT COUNT(*) FROM submissions WHERE status = 'approved' AND featured)       AS featured,
        (SELECT COUNT(DISTINCT user_id) FROM submissions
           WHERE status = 'approved' AND user_id IS NOT NULL)                           AS contributors
    `);
    const row = r.rows?.[0];
    if (!row) return null;
    return {
      submissions: Number(row.subs) || 0,
      feats: Number(row.feats) || 0,
      featured: Number(row.featured) || 0,
      contributors: Number(row.contributors) || 0,
    };
  } catch {
    return null;
  }
}

/** Keeps the carnival aesthetic: real numbers, always two digits wide. */
export function padCount(n: number): string {
  return String(n).padStart(2, "0");
}
