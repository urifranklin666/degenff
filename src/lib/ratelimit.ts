import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { rateLimit } = schema;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * Tiny fixed-window counter backed by the rate_limit table.
 *
 *   key       — globally unique identifier (e.g. `submit:userId:abc123`)
 *   max       — number of allowed events in the window
 *   windowMs  — window length in milliseconds
 *
 * Race-y under heavy contention (no SELECT FOR UPDATE), but we're rate
 * limiting human submissions, not high-throughput API endpoints. A few
 * extra slips per window is fine.
 */
export async function consumeRateLimit(opts: {
  key: string;
  max: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const now = new Date();
  const existing = await db.query.rateLimit.findFirst({ where: eq(rateLimit.key, opts.key) });

  if (!existing || existing.resetsAt <= now) {
    // Reset / first hit in this window
    const resetsAt = new Date(now.getTime() + opts.windowMs);
    if (existing) {
      await db.update(rateLimit)
        .set({ count: 1, resetsAt })
        .where(eq(rateLimit.key, opts.key));
    } else {
      await db.insert(rateLimit).values({ key: opts.key, count: 1, resetsAt });
    }
    return { ok: true, remaining: opts.max - 1, retryAfterSec: 0 };
  }

  if (existing.count >= opts.max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(0, Math.ceil((existing.resetsAt.getTime() - now.getTime()) / 1000)),
    };
  }

  await db.update(rateLimit)
    .set({ count: existing.count + 1 })
    .where(eq(rateLimit.key, opts.key));
  return { ok: true, remaining: opts.max - (existing.count + 1), retryAfterSec: 0 };
}

export function formatRetryAfter(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
