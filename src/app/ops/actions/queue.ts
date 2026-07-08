"use server";

import { revalidatePath } from "next/cache";
import { assertModAction } from "@/lib/ops/auth";
import {
  approveSubmission,
  rejectSubmission,
  withdrawSubmission,
  unfeatureSubmission,
  approveFeat,
  rejectFeat,
  withdrawFeat,
  type ActionResult,
} from "@/lib/ops/queue";

export type QueueKind = "sub" | "feat";
export type SubAction = "approve" | "feature" | "reject" | "withdraw" | "unfeature";
export type FeatAction = "approve" | "feature" | "reject" | "withdraw";
export type QueueAction = SubAction | FeatAction;

export type QueueResult = {
  ok: number;
  failed: number;
  noChange: number;
  perId: Record<string, ActionResult>;
};

const MAX_BULK = 100;

async function runOne(
  kind: QueueKind,
  action: QueueAction,
  id: string,
  modUserId: string,
  modHandle: string,
  reason?: string,
): Promise<ActionResult> {
  if (kind === "sub") {
    switch (action) {
      case "approve":   return approveSubmission(id, modUserId, modHandle, false);
      case "feature":   return approveSubmission(id, modUserId, modHandle, true);
      case "reject":    return rejectSubmission(id, modUserId, modHandle, reason);
      case "withdraw":  return withdrawSubmission(id, modUserId, modHandle);
      case "unfeature": return unfeatureSubmission(id, modUserId);
    }
  } else {
    switch (action) {
      case "approve":   return approveFeat(id, modUserId, modHandle, false);
      case "feature":   return approveFeat(id, modUserId, modHandle, true);
      case "reject":    return rejectFeat(id, modUserId, modHandle);
      case "withdraw":  return withdrawFeat(id, modUserId, modHandle);
      case "unfeature": return { ok: false, reason: "n/a for feats" };
    }
  }
}

export async function bulkQueueAction(opts: {
  kind: QueueKind;
  action: QueueAction;
  ids: string[];
  reason?: string;
}): Promise<QueueResult> {
  const mod = await assertModAction();
  const ids = opts.ids.slice(0, MAX_BULK).filter((s) => typeof s === "string" && s.length > 0);
  const perId: Record<string, ActionResult> = {};
  let ok = 0, failed = 0, noChange = 0;

  // Sequential — Discord REST mirrors are rate-limited, and these run in <1s
  // per item. Parallelism would risk hitting Discord's 50req/sec global cap.
  for (const id of ids) {
    try {
      const r = await runOne(opts.kind, opts.action, id, mod.id, mod.handle, opts.reason);
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
  reason?: string;
}): Promise<ActionResult> {
  const mod = await assertModAction();
  const r = await runOne(opts.kind, opts.action, opts.id, mod.id, mod.handle, opts.reason);
  revalidatePath("/ops/queue");
  revalidatePath("/ops");
  return r;
}
