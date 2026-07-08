"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAction } from "@/lib/ops/auth";
import { isOpsUnit, restartService } from "@/lib/ops/systemd";

export type RestartState = {
  ok: boolean;
  message: string;
  unit?: string;
  at?: string;
};

export async function restartServiceAction(
  _prev: RestartState | null,
  formData: FormData,
): Promise<RestartState> {
  await assertAdminAction();
  const raw = String(formData.get("unit") ?? "");
  if (!isOpsUnit(raw)) {
    return { ok: false, message: "unknown unit" };
  }
  const result = await restartService(raw);
  revalidatePath("/ops/services");
  revalidatePath("/ops");
  return {
    ok: result.ok,
    message: result.output,
    unit: raw,
    at: new Date().toISOString(),
  };
}
