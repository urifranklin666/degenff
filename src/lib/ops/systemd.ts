import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

/** Whitelist of unit names operable from /ops. Hard-coded — no user input
 *  ever flows into argv, so command injection is structurally impossible. */
export const OPS_UNITS = ["degenff-web", "degenff-bot", "cloudflared"] as const;
export type OpsUnit = (typeof OPS_UNITS)[number];

export function isOpsUnit(s: string): s is OpsUnit {
  return (OPS_UNITS as readonly string[]).includes(s);
}

export type ServiceStatus = {
  unit: OpsUnit;
  loadState: string;     // loaded, not-found, ...
  activeState: string;   // active, inactive, failed, activating
  subState: string;      // running, dead, exited, ...
  unitFileState: string; // enabled, disabled, static
  mainPid: number | null;
  memoryBytes: number | null;
  activeSince: string | null;     // ISO timestamp
  activeForMs: number | null;
  description: string;
};

/** Reads systemd show output for a single unit. Always returns a status —
 *  on unknown unit / missing service, fields fall back to "unknown". */
export async function getServiceStatus(unit: OpsUnit): Promise<ServiceStatus> {
  const props = [
    "LoadState",
    "ActiveState",
    "SubState",
    "UnitFileState",
    "MainPID",
    "MemoryCurrent",
    "ActiveEnterTimestamp",
    "Description",
  ].join(",");

  let raw = "";
  try {
    const { stdout } = await execFileP(
      "sudo",
      ["-n", "systemctl", "show", unit, "--property", props, "--no-pager"],
      { timeout: 5000 },
    );
    raw = stdout;
  } catch (err) {
    const e = err as { stdout?: string };
    raw = e.stdout ?? "";
  }

  const kv: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) kv[line.slice(0, i)] = line.slice(i + 1);
  }

  const memNum = Number(kv.MemoryCurrent);
  const pidNum = Number(kv.MainPID);
  // systemd prints "n/a" or epoch when not yet started; parse cautiously
  const ts = kv.ActiveEnterTimestamp && kv.ActiveEnterTimestamp !== "n/a"
    ? new Date(kv.ActiveEnterTimestamp)
    : null;
  const activeSinceIso = ts && !isNaN(ts.getTime()) ? ts.toISOString() : null;
  const activeForMs = ts && !isNaN(ts.getTime()) ? Date.now() - ts.getTime() : null;

  return {
    unit,
    loadState: kv.LoadState || "unknown",
    activeState: kv.ActiveState || "unknown",
    subState: kv.SubState || "unknown",
    unitFileState: kv.UnitFileState || "unknown",
    mainPid: Number.isFinite(pidNum) && pidNum > 0 ? pidNum : null,
    memoryBytes: Number.isFinite(memNum) && memNum > 0 ? memNum : null,
    activeSince: activeSinceIso,
    activeForMs,
    description: kv.Description || unit,
  };
}

export async function getAllServiceStatuses(): Promise<ServiceStatus[]> {
  return Promise.all(OPS_UNITS.map(getServiceStatus));
}

export async function restartService(unit: OpsUnit): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFileP(
      "sudo",
      ["-n", "systemctl", "restart", unit],
      { timeout: 30_000 },
    );
    return { ok: true, output: (stdout + stderr).trim() || "ok" };
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    return { ok: false, output: (e.stderr ?? e.stdout ?? e.message ?? "restart failed").trim() };
  }
}

export function formatUptime(ms: number | null): string {
  if (ms == null || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatBytes(b: number | null): string {
  if (b == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = b;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${units[i]}`;
}
