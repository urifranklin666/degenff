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

/** Feat (long-form coding showcase) submission schema. */
export const FeatSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  summary: z
    .string()
    .trim()
    .max(320, "Summary too long")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9](?:[a-z0-9-]{0,94}[a-z0-9])?$/,
      "Slug: lowercase letters, digits, and dashes; can't start or end with a dash",
    )
    .max(96)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  bodyMd: z.string().max(200_000, "Writeup too long").default(""),
  repoUrl: z
    .string()
    .url()
    .regex(/^https?:\/\//, "Must be http or https")
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  demoUrl: z
    .string()
    .url()
    .regex(/^https?:\/\//, "Must be http or https")
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
});

export type FeatInput = z.infer<typeof FeatSchema>;
