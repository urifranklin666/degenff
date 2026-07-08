import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isOpsUnit, type OpsUnit } from "./systemd";

const execFileP = promisify(execFile);

export type Priority = "all" | "err" | "warning" | "info";

const PRIORITY_LEVEL: Record<Exclude<Priority, "all">, string> = {
  err: "3",     // emerg..err
  warning: "4", // emerg..warning
  info: "6",    // emerg..info
};

export type JournalEntry = {
  timestamp: string;
  message: string;
  priority?: string;
};

const MAX_LINES = 1000;

/** Read recent journal entries for a single whitelisted unit.
 *  - `lines` is clamped to [10, 1000]
 *  - `grep` is passed to journalctl --grep (it accepts a Perl regex; we
 *    don't substitute it into a shell, so injection is not a concern, but
 *    we keep it short to avoid silly regex DoS)
 *  - `priority` filters by syslog level via -p
 */
export async function tailJournal(opts: {
  unit: OpsUnit;
  lines?: number;
  grep?: string;
  priority?: Priority;
}): Promise<{ entries: JournalEntry[]; error: string | null }> {
  if (!isOpsUnit(opts.unit)) {
    return { entries: [], error: "unknown unit" };
  }
  const lines = Math.min(MAX_LINES, Math.max(10, opts.lines ?? 200));

  const args = [
    "-n", "journalctl",
    "-u", opts.unit,
    "-n", String(lines),
    "--no-pager",
    "--output=json",
  ];
  if (opts.priority && opts.priority !== "all") {
    args.push("-p", PRIORITY_LEVEL[opts.priority]);
  }
  if (opts.grep) {
    const g = opts.grep.slice(0, 200);
    args.push("--grep", g);
  }

  try {
    const { stdout } = await execFileP("sudo", args, {
      timeout: 10_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const entries: JournalEntry[] = [];
    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line) as {
          __REALTIME_TIMESTAMP?: string;
          MESSAGE?: string | number[];
          PRIORITY?: string;
        };
        const us = Number(j.__REALTIME_TIMESTAMP ?? 0);
        const ms = Math.floor(us / 1000);
        const ts = ms ? new Date(ms).toISOString() : "";
        // MESSAGE can be a byte array for non-utf8 lines
        const msg = Array.isArray(j.MESSAGE)
          ? Buffer.from(j.MESSAGE).toString("utf8")
          : (j.MESSAGE ?? "");
        entries.push({
          timestamp: ts,
          message: String(msg),
          priority: j.PRIORITY,
        });
      } catch {
        // ignore malformed line
      }
    }
    return { entries, error: null };
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    return {
      entries: [],
      error: (e.stderr ?? e.message ?? "journal read failed").trim(),
    };
  }
}

/** syslog priority → semantic color class. */
export function priorityClass(p: string | undefined): "err" | "warn" | "info" | "" {
  const n = Number(p);
  if (!Number.isFinite(n)) return "";
  if (n <= 3) return "err";
  if (n === 4) return "warn";
  if (n >= 6) return "info";
  return "";
}
