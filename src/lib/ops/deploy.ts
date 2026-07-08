import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileP = promisify(execFile);

const DEPLOY_PATH = path.join(process.cwd(), "ops", "deploy.sh");

export type DeployResult = {
  ok: boolean;
  exitCode: number | null;
  output: string;
  durationMs: number;
  startedAt: string;
};

/** Runs ops/deploy.sh end-to-end. 5 minute timeout. Captures combined output.
 *  Caller must already be admin-gated. */
export async function runDeploy(): Promise<DeployResult> {
  const startedAt = new Date();
  const t0 = Date.now();
  try {
    const { stdout, stderr } = await execFileP("bash", [DEPLOY_PATH], {
      timeout: 5 * 60_000,
      maxBuffer: 16 * 1024 * 1024,
      cwd: process.cwd(),
    });
    return {
      ok: true,
      exitCode: 0,
      output: combine(stdout, stderr),
      durationMs: Date.now() - t0,
      startedAt: startedAt.toISOString(),
    };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      exitCode: typeof e.code === "number" ? e.code : null,
      output: combine(e.stdout ?? "", e.stderr ?? "") + (e.message ? `\n${e.message}` : ""),
      durationMs: Date.now() - t0,
      startedAt: startedAt.toISOString(),
    };
  }
}

function combine(out: string, err: string): string {
  if (out && err) return `${out.trim()}\n--- stderr ---\n${err.trim()}`;
  return (out || err).trim();
}
