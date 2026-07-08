import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + DB ping for the Cloudflare Tunnel and any uptime monitor.
 * Returns 200 on OK, 503 on DB failure. Always JSON.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let dbErr: string | null = null;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch (err) {
    dbErr = (err as Error).message.slice(0, 200);
  }

  const body = {
    ok: dbOk,
    db: dbOk ? "ok" : "fail",
    dbError: dbErr,
    uptimeSec: Math.floor(process.uptime()),
    pid: process.pid,
    node: process.version,
    checkedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
  };

  return new Response(JSON.stringify(body), {
    status: dbOk ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
