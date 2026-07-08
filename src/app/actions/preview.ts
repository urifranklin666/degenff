"use server";

import { auth } from "@/auth";
import { renderMarkdown } from "@/lib/markdown";

const MAX_MD_LEN = 200_000;

/**
 * Server-side markdown preview for /feats/new.
 * Auth-gated to a signed-in user so we don't expose an unauth render
 * endpoint. Reuses the exact same renderMarkdown pipeline used at write
 * time, so what you see in preview is what gets stored.
 */
export async function previewMarkdownAction(md: string): Promise<{ html: string }> {
  const session = await auth();
  if (!session?.user?.id) return { html: "" };
  const safe = (md ?? "").slice(0, MAX_MD_LEN);
  return { html: renderMarkdown(safe) };
}
