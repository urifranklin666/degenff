import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __degenff_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __degenff_db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Source /etc/degenff/env before running 'next build' / 'next dev' / the bot.",
  );
}

const pool =
  globalThis.__degenff_pool ??
  new Pool({
    connectionString: url,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    application_name: "degenff",
  });
if (process.env.NODE_ENV !== "production") globalThis.__degenff_pool = pool;

export const db =
  globalThis.__degenff_db ??
  drizzle(pool, { schema });
if (process.env.NODE_ENV !== "production") globalThis.__degenff_db = db;

export { schema };
export type DB = typeof db;
