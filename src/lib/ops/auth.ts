import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type OpsRole = "mod" | "admin";

export type OpsUser = {
  id: string;
  role: OpsRole;
  handle: string;
  discordId: string | null;
};

/** Server-side guard for /ops pages and server actions. mod | admin pass. */
export async function requireOps(): Promise<OpsUser> {
  const session = await auth();
  const u = session?.user;
  if (!u || (u.role !== "mod" && u.role !== "admin")) {
    redirect("/?forbidden=1");
  }
  return { id: u.id, role: u.role as OpsRole, handle: u.handle, discordId: u.discordId };
}

/** Stricter guard: only admin. mods get bounced. */
export async function requireAdmin(): Promise<OpsUser> {
  const u = await requireOps();
  if (u.role !== "admin") redirect("/ops?denied=1");
  return u;
}

/** Server-action variant: throw instead of redirect (actions return values). */
export async function assertAdminAction(): Promise<OpsUser> {
  const session = await auth();
  const u = session?.user;
  if (!u || u.role !== "admin") throw new Error("forbidden: admin only");
  return { id: u.id, role: "admin", handle: u.handle, discordId: u.discordId };
}

export async function assertModAction(): Promise<OpsUser> {
  const session = await auth();
  const u = session?.user;
  if (!u || (u.role !== "mod" && u.role !== "admin")) {
    throw new Error("forbidden: mod or admin only");
  }
  return { id: u.id, role: u.role as OpsRole, handle: u.handle, discordId: u.discordId };
}
