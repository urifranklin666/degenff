"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { assertAdminAction } from "@/lib/ops/auth";
import { scanOrphans, type OrphanScan } from "@/lib/ops/storage";

const { users } = schema;

export async function scanOrphansAction(): Promise<OrphanScan> {
  await assertAdminAction();
  return scanOrphans();
}

export type BanState = {
  ok: boolean;
  message: string;
};

const HANDLE_RX = /^[a-z0-9_.-]{1,64}$/i;
const DISCORD_ID_RX = /^\d{10,25}$/;

export async function banUserAction(
  _prev: BanState | null,
  formData: FormData,
): Promise<BanState> {
  await assertAdminAction();
  const ident = String(formData.get("ident") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const unban = formData.get("unban") === "1";

  if (!ident) return { ok: false, message: "handle or discord id required" };

  let where;
  if (DISCORD_ID_RX.test(ident)) {
    where = eq(users.discordId, ident);
  } else if (HANDLE_RX.test(ident)) {
    where = eq(users.handle, ident);
  } else {
    return { ok: false, message: "ident must be a handle (a–z, 0–9, _-.) or a Discord snowflake" };
  }

  const target = await db.query.users.findFirst({ where });
  if (!target) return { ok: false, message: "user not found" };
  if (target.role === "admin") {
    return { ok: false, message: "cannot ban an admin from here — demote first" };
  }

  await db.update(users)
    .set({ banned: !unban, bannedReason: unban ? null : (reason || "no reason given") })
    .where(eq(users.id, target.id));

  revalidatePath("/ops/storage");
  return {
    ok: true,
    message: unban ? `unbanned @${target.handle}` : `banned @${target.handle}`,
  };
}

export type BannedRow = {
  id: string;
  handle: string;
  discordId: string | null;
  bannedReason: string | null;
};

export async function listBanned(): Promise<BannedRow[]> {
  // Read-only — exported as a helper that callers can use from server pages.
  const rows = await db.query.users.findMany({
    where: (u, { eq: e }) => e(u.banned, true),
    orderBy: (u) => u.handle,
    limit: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    handle: r.handle,
    discordId: r.discordId,
    bannedReason: r.bannedReason,
  }));
}

