"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { bureauFormByCode, MAX_FILING_CHARS } from "@/lib/bureau-shared";
import { consumeRateLimit, formatRetryAfter } from "@/lib/ratelimit";

const { bureauFilings } = schema;

export type FileFormResult =
  | { ok: true; filingId: string; receipt: string }
  | { ok: false; error: string };

export async function fileForm(input: {
  formCode: string;
  body: string;
}): Promise<FileFormResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "The bureau requires identification. Sign in." };
  }
  if (session?.user?.role === "visitor") {
    return { ok: false, error: "Banned parties may not file. That is itself on file." };
  }

  const form = bureauFormByCode(String(input.formCode ?? ""));
  if (!form) {
    return { ok: false, error: "No such form. Filing for a nonexistent form requires form 0-0, which does not exist either." };
  }
  const body = String(input.body ?? "").trim();
  if (body.length < 10) {
    return { ok: false, error: "The plea is too short. The clerk needs something to deny." };
  }
  if (body.length > MAX_FILING_CHARS) {
    return { ok: false, error: `Pleas are capped at ${MAX_FILING_CHARS} characters. Brevity is a virtue the bureau enforces.` };
  }

  const rl = await consumeRateLimit({
    key: `bureau:${userId}`,
    max: 3,
    windowMs: 24 * 3600 * 1000,
  });
  if (!rl.ok) {
    return { ok: false, error: `Filing limit reached. The window reopens in ${formatRetryAfter(rl.retryAfterSec)}.` };
  }

  const [row] = await db
    .insert(bureauFilings)
    .values({ userId, formCode: form.code, body })
    .returning();

  // Wake the clerk. Best-effort: an unprocessed filing is still very bureau.
  try {
    await db.execute(
      sql`SELECT pg_notify('bureau_filed', ${JSON.stringify({ filingId: row.id })})`,
    );
  } catch (err) {
    console.error("[bureau] notify failed:", err);
  }

  revalidatePath("/bureau");
  return {
    ok: true,
    filingId: row.id,
    receipt: `FILING ${row.id.toUpperCase().slice(0, 8)} · FORM ${form.code} · RECEIVED`,
  };
}
