import { z } from "zod";

export const SUBMISSION_MEDIA = [
  "image",
  "audio",
  "video",
  "text",
  "code",
  "link",
  "mixed",
] as const;

/** comma- or whitespace-separated tags → array of slugs */
export function parseTagsInput(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[,\n]/)
        .map((t) =>
          t
            .toLowerCase()
            .trim()
            .replace(/^#+/, "")
            .replace(/[^a-z0-9 _-]/g, "")
            .replace(/\s+/g, "-")
            .slice(0, 40),
        )
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

export const SubmitSchema = z.object({
  medium: z.enum(SUBMISSION_MEDIA),
  title: z.string().trim().min(1, "Title required").max(200),
  body: z
    .string()
    .max(50_000, "Too long")
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  linkUrl: z
    .string()
    .url("Link must be a URL")
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  nsfw: z.boolean().default(false),
});

export type SubmitInput = z.infer<typeof SubmitSchema>;
