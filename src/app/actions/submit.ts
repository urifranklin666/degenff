"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { processUpload } from "@/lib/uploads";
import { SubmitSchema, parseTagsInput } from "@/lib/validation";
import { notifyNewSubmission } from "@/discord/notify";

const { submissions } = schema;

export type SubmitState = { ok: boolean; error?: string; submissionId?: string };

export async function submitWork(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not signed in. Refresh and try again." };
  }

  // Validate scalar fields
  const parsed = SubmitSchema.safeParse({
    medium: formData.get("medium"),
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    linkUrl: formData.get("linkUrl") || undefined,
    tags: parseTagsInput(formData.get("tags") as string | null),
    nsfw: formData.get("nsfw") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  const { medium, title, body, linkUrl, tags, nsfw } = parsed.data;

  // Process uploads
  const rawFiles = formData.getAll("files");
  const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

  // Medium-specific minimum requirements
  if ((medium === "image" || medium === "audio" || medium === "video") && files.length === 0) {
    return { ok: false, error: `Medium '${medium}' requires at least one file.` };
  }
  if (medium === "link" && !linkUrl) {
    return { ok: false, error: "Medium 'link' requires a URL." };
  }
  if ((medium === "text" || medium === "code") && !body) {
    return { ok: false, error: `Medium '${medium}' requires a body.` };
  }

  let storedFiles;
  try {
    storedFiles = await Promise.all(files.map(processUpload));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "File processing failed." };
  }

  // Insert
  const inserted = await db.insert(submissions).values({
    userId: session.user.id,
    medium,
    title,
    body,
    linkUrl,
    tags,
    nsfw,
    files: storedFiles.map(({ path, mime, bytes, width, height }) => ({
      path, mime, bytes, width, height,
    })),
    status: "pending",
  }).returning({ id: submissions.id });

  const submissionId = inserted[0]?.id;
  if (!submissionId) return { ok: false, error: "Database insert failed." };

  // Best-effort: post to Discord #mod-queue. Don't block the user if Discord is sad.
  try {
    await notifyNewSubmission(submissionId);
  } catch (err) {
    console.error("[submit] notifyNewSubmission failed:", err);
  }

  redirect(`/submissions/${submissionId}`);
}
