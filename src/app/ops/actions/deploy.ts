"use server";

import { assertAdminAction, assertModAction } from "@/lib/ops/auth";
import { runDeploy, type DeployResult } from "@/lib/ops/deploy";
import { isOpsUnit, OPS_UNITS } from "@/lib/ops/systemd";
import { tailJournal, type JournalEntry, type Priority } from "@/lib/ops/journal";

export async function deployAction(): Promise<DeployResult> {
  await assertAdminAction();
  return runDeploy();
}

export type TailState = {
  unit: string;
  entries: JournalEntry[];
  error: string | null;
  fetchedAt: string;
};

export async function tailLogsAction(opts: {
  unit: string;
  lines: number;
  grep: string;
  priority: Priority;
}): Promise<TailState> {
  await assertModAction();
  const unit = isOpsUnit(opts.unit) ? opts.unit : OPS_UNITS[0];
  const result = await tailJournal({
    unit,
    lines: opts.lines,
    grep: opts.grep || undefined,
    priority: opts.priority,
  });
  return {
    unit,
    entries: result.entries,
    error: result.error,
    fetchedAt: new Date().toISOString(),
  };
}
