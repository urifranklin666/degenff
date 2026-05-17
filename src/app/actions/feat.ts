"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { processUpload } from "@/lib/uploads";
import { FeatSchema, parseTagsInput } from "@/lib/validation";
import { renderMarkdown, slugify, isValidSlug } from "@/lib/markdown";
import { notifyNewFeat } from "@/discord/notify";

const { feats } = schema;

export type FeatState = { ok: boolean; error?: string; slug?: string };

const SLUG_DEDUP_LIMIT = 50;

export async function submitFeat(_prev: FeatState, formData: FormData): Promise<FeatState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const parsed = FeatSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    slug: formData.get("slug") || undefined,
    bodyMd: (formData.get("bodyMd") as string) ?? "",
    repoUrl: formData.get("repoUrl") || undefined,
    demoUrl: formData.get("demoUrl") || undefined,
    tags: parseTagsInput(formData.get("tags") as string | null),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  const { title, summary, bodyMd, repoUrl, demoUrl, tags } = parsed.data;

  // Settle on a base slug. Reject reserved + invalid.
  const baseSlug = parsed.data.slug ?? slugify(title);
  if (!isValidSlug(baseSlug)) {
    return { ok: false, error: "Slug is invalid or reserved." };
  }

  // Optional hero image
  const hero = formData.get("hero");
  let heroImagePath: string | undefined;
  if (hero instanceof File && hero.size > 0) {
    if (!hero.type.startsWith("image/") && !hero.name.match(/\.(jpe?g|png|webp|avif|gif)$/i)) {
      return { ok: false, error: "Hero image must be image/*." };
    }
    try {
      const stored = await processUpload(hero);
      if (!stored.mime.startsWith("image/")) {
        return { ok: false, error: "Hero must be an image." };
      }
      heroImagePath = stored.path;
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Hero upload failed." };
    }
  }

  // Sanitize markdown → HTML
  const bodyHtml = renderMarkdown(bodyMd);

  // Slug uniqueness — try, on unique-constraint hit append -N and retry.
  let attempt = 0;
  let chosenSlug = baseSlug;
  let insertedId: string | undefined;
  while (attempt < SLUG_DEDUP_LIMIT) {
    try {
      const [row] = await db
        .insert(feats)
        .values({
          userId: session.user.id,
          slug: chosenSlug,
          title,
          summary,
          bodyMd,
          bodyHtml,
          heroImagePath,
          repoUrl,
          demoUrl,
          tags,
          status: "pending",
        })
        .returning({ id: feats.id, slug: feats.slug });
      insertedId = row.id;
      chosenSlug = row.slug;
      break;
    } catch (err) {
      const msg = String(err);
      // Postgres unique violation
      if (msg.includes("feats_slug_unique") || msg.includes("duplicate key")) {
        attempt += 1;
        chosenSlug = `${baseSlug}-${attempt + 1}`;
        continue;
      }
      console.error("[submitFeat] insert failed:", err);
      return { ok: false, error: "Database insert failed." };
    }
  }
  if (!insertedId) {
    return { ok: false, error: "Couldn't find a free slug. Try changing the title." };
  }

  // Best-effort: post to Discord mod-queue
  try {
    await notifyNewFeat(insertedId);
  } catch (err) {
    console.error("[submitFeat] notifyNewFeat failed:", err);
  }

  redirect(`/feats/${chosenSlug}`);
}

/** Best-effort lookup of an existing feat by slug — used by the new-feat page
 * to render a 'slug already taken' hint at the boundary (optional). */
export async function isSlugTaken(slug: string): Promise<boolean> {
  if (!isValidSlug(slug)) return true;
  const row = await db.query.feats.findFirst({ where: eq(feats.slug, slug) });
  return !!row;
}
