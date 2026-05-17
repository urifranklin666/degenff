import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __degenff_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __degenff_db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function makePool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Source /etc/degenff/env before running the app.",
    );
  }
  return new Pool({
    connectionString: url,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    application_name: "degenff",
  });
}

function getPool(): Pool {
  if (!globalThis.__degenff_pool) globalThis.__degenff_pool = makePool();
  return globalThis.__degenff_pool;
}

// Lazy db proxy: actual pool only created on first query, not on module import.
// This lets `next build` collect routes without touching Postgres.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, _receiver) {
    if (!globalThis.__degenff_db) {
      globalThis.__degenff_db = drizzle(getPool(), { schema });
    }
    // Forward to the real drizzle instance.
    const real = globalThis.__degenff_db as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export { schema };
export type DB = typeof db;
