"use client";

import { useActionState, useState, useEffect } from "react";
import { submitFeat, type FeatState } from "@/app/actions/feat";

const INITIAL: FeatState = { ok: false };

function clientSlugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export default function NewFeatForm() {
  const [state, formAction, pending] = useActionState(submitFeat, INITIAL);
  const [title, setTitle] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");

  // Auto-derive slug from title until the user edits it manually.
  useEffect(() => {
    if (!slugTouched) setSlug(clientSlugify(title));
  }, [title, slugTouched]);

  return (
    <form action={formAction} className="submit-form">
      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="The thing you almost can't believe you finished"
        />
      </div>

      <div className="field">
        <label htmlFor="slug">Slug <em>(URL — auto-derived; edit if you want)</em></label>
        <input
          id="slug"
          name="slug"
          maxLength={96}
          pattern="^[a-z0-9](?:[a-z0-9-]{0,94}[a-z0-9])?$"
          value={slug}
          onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
          placeholder="the-thing"
        />
        <small>
          Final URL: <code>/feats/{slug || "your-slug"}</code>. We&apos;ll append <code>-2</code>, <code>-3</code> if it&apos;s taken.
        </small>
      </div>

      <div className="field">
        <label htmlFor="summary">One-line summary</label>
        <input
          id="summary"
          name="summary"
          maxLength={320}
          placeholder="What it is, in one sentence."
        />
      </div>

      <div className="field">
        <label htmlFor="hero">Hero image <em>(optional)</em></label>
        <input id="hero" name="hero" type="file" accept="image/*" />
        <small>JPEG/PNG/WebP/AVIF/GIF, max 24MB. EXIF stripped.</small>
      </div>

      <div className="field">
        <label htmlFor="bodyMd">Writeup (Markdown)</label>
        <textarea
          id="bodyMd"
          name="bodyMd"
          rows={18}
          maxLength={200_000}
          placeholder="## What it is

A few paragraphs about why you built it and how it went.

## Stack

- node
- postgres
- a Dell R630

## What broke

The first build. The second build. The third build."
        />
        <small>
          Headings, lists, links, code blocks, tables, blockquotes. Inline HTML is sanitized.
          Only the hero image renders as an image — no inline images in v1.
        </small>
      </div>

      <div className="field">
        <label htmlFor="repoUrl">Repo URL <em>(optional)</em></label>
        <input id="repoUrl" name="repoUrl" type="url" placeholder="https://github.com/…" maxLength={2000} />
      </div>

      <div className="field">
        <label htmlFor="demoUrl">Demo URL <em>(optional)</em></label>
        <input id="demoUrl" name="demoUrl" type="url" placeholder="https://…" maxLength={2000} />
      </div>

      <div className="field">
        <label htmlFor="tags">Tags</label>
        <input id="tags" name="tags" placeholder="comma, separated, tags" />
        <small>Max 12 tags.</small>
      </div>

      {state.error && (
        <p className="form-error" role="alert">
          <strong>Rejected:</strong> {state.error}
        </p>
      )}

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit Feat"}
      </button>
    </form>
  );
}
