import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/db";

const execFileP = promisify(execFile);

const UPLOADS_ROOT = "/var/lib/degenff/uploads";

export type UploadsStats = {
  bytes: number | null;
  files: number | null;
  human: string;
};

export async function uploadsStats(): Promise<UploadsStats> {
  // du for total size; find -type f for count. Both read-only.
  let bytes: number | null = null;
  let files: number | null = null;
  try {
    const { stdout } = await execFileP("du", ["-sb", UPLOADS_ROOT], { timeout: 15_000 });
    const m = stdout.match(/^(\d+)/);
    if (m) bytes = Number(m[1]);
  } catch {
    // dir might not exist yet in dev
  }
  try {
    const { stdout } = await execFileP(
      "find",
      [UPLOADS_ROOT, "-type", "f"],
      { timeout: 15_000, maxBuffer: 32 * 1024 * 1024 },
    );
    files = stdout.split("\n").filter(Boolean).length;
  } catch {
    /* ignore */
  }
  return { bytes, files, human: humanBytes(bytes) };
}

export type TableCount = { table: string; rows: number };

export async function tableCounts(): Promise<TableCount[]> {
  // pg_stat_user_tables is fast and good enough for an at-a-glance — exact
  // count is irrelevant for the panel and a real COUNT(*) on every table
  // would scan the whole DB.
  const rows = await db.execute<{ relname: string; n_live_tup: string }>(sql`
    SELECT relname, n_live_tup
    FROM pg_stat_user_tables
    ORDER BY relname
  `);
  return (rows.rows ?? []).map((r) => ({
    table: r.relname,
    rows: Number(r.n_live_tup) || 0,
  }));
}

export type OrphanScan = {
  scannedFiles: number;
  referenced: number;
  orphans: string[]; // relative paths under uploads root
  durationMs: number;
};

/** Walk /var/lib/degenff/uploads and flag any file not referenced by
 *  feats.heroImagePath. Caps the orphan list at 500 so an empty DB
 *  doesn't explode the response. */
export async function scanOrphans(): Promise<OrphanScan> {
  const t0 = Date.now();

  // 1. all referenced paths from DB
  const referenced = new Set<string>();
  const featRows = await db.execute<{ hero_image_path: string | null }>(sql`
    SELECT hero_image_path FROM feats WHERE hero_image_path IS NOT NULL
  `);
  for (const r of featRows.rows ?? []) {
    if (r.hero_image_path) referenced.add(r.hero_image_path);
  }

  // 2. walk FS
  const orphans: string[] = [];
  let scannedFiles = 0;
  async function walk(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = path.join(dir, name);
      let s;
      try { s = await stat(full); } catch { continue; }
      if (s.isDirectory()) {
        await walk(full);
      } else if (s.isFile()) {
        scannedFiles++;
        const rel = path.relative(UPLOADS_ROOT, full);
        if (!referenced.has(rel) && orphans.length < 500) {
          orphans.push(rel);
        }
      }
    }
  }
  await walk(UPLOADS_ROOT);

  return {
    scannedFiles,
    referenced: referenced.size,
    orphans,
    durationMs: Date.now() - t0,
  };
}

export function humanBytes(b: number | null): string {
  if (b == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = b;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${units[i]}`;
}
