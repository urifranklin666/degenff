"use server";

import { revalidatePath } from "next/cache";
import { assertModAction } from "@/lib/ops/auth";
import {
  approveFeat,
  rejectFeat,
  withdrawFeat,
  type ActionResult,
} from "@/lib/ops/queue";

export type QueueKind = "feat";
export type QueueAction = "approve" | "feature" | "reject" | "withdraw";

export type QueueResult = {
  ok: number;
  failed: number;
  noChange: number;
  perId: Record<string, ActionResult>;
};

const MAX_BULK = 100;

async function runOne(
  action: QueueAction,
  id: string,
  modUserId: string,
  modHandle: string,
): Promise<ActionResult> {
  switch (action) {
    case "approve":  return approveFeat(id, modUserId, modHandle, false);
    case "feature":  return approveFeat(id, modUserId, modHandle, true);
    case "reject":   return rejectFeat(id, modUserId, modHandle);
    case "withdraw": return withdrawFeat(id, modUserId, modHandle);
  }
}

export async function bulkQueueAction(opts: {
  kind: QueueKind;
  action: QueueAction;
  ids: string[];
}): Promise<QueueResult> {
  const mod = await assertModAction();
  const ids = opts.ids.slice(0, MAX_BULK).filter((s) => typeof s === "string" && s.length > 0);
  const perId: Record<string, ActionResult> = {};
  let ok = 0, failed = 0, noChange = 0;

  // Sequential — Discord REST mirrors are rate-limited, and these run in <1s
  // per item. Parallelism would risk hitting Discord's 50req/sec global cap.
  for (const id of ids) {
    try {
      const r = await runOne(opts.action, id, mod.id, mod.handle);
      perId[id] = r;
      if (r.ok) ok++;
      else if (r.reason === "no-change") noChange++;
      else failed++;
    } catch (err) {
      perId[id] = { ok: false, reason: (err as Error).message.slice(0, 200) };
      failed++;
    }
  }

  revalidatePath("/ops/queue");
  revalidatePath("/ops");
  return { ok, failed, noChange, perId };
}

export async function singleQueueAction(opts: {
  kind: QueueKind;
  action: QueueAction;
  id: string;
}): Promise<ActionResult> {
  const mod = await assertModAction();
  const r = await runOne(opts.action, opts.id, mod.id, mod.handle);
  revalidatePath("/ops/queue");
  revalidatePath("/ops");
  return r;
}
