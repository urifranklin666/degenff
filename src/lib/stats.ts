import { sql } from "drizzle-orm";
import { db } from "@/db";

export type SiteStats = {
  feats: number;
  roomMessages: number;
  awards: number;
  residents: number;
};

/**
 * Live hero counts. Returns null on any DB failure so the homepage can
 * fall back to its lying placeholder numbers instead of 500ing.
 */
export async function getSiteStats(): Promise<SiteStats | null> {
  try {
    const r = await db.execute<{
      feats: string;
      room_messages: string;
      awards: string;
      residents: string;
    }>(sql`
      SELECT
        (SELECT COUNT(*) FROM feats WHERE status = 'approved')          AS feats,
        (SELECT COUNT(*) FROM room_messages WHERE deleted_at IS NULL)   AS room_messages,
        (SELECT COUNT(*) FROM user_awards)                              AS awards,
        (SELECT COUNT(*) FROM users WHERE NOT banned)                   AS residents
    `);
    const row = r.rows?.[0];
    if (!row) return null;
    return {
      feats: Number(row.feats) || 0,
      roomMessages: Number(row.room_messages) || 0,
      awards: Number(row.awards) || 0,
      residents: Number(row.residents) || 0,
    };
  } catch {
    return null;
  }
}

/** Keeps the carnival aesthetic: real numbers, always two digits wide. */
export function padCount(n: number): string {
  return String(n).padStart(2, "0");
}
