"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { submitFeat, type FeatState } from "@/app/actions/feat";
import { previewMarkdownAction } from "@/app/actions/preview";

const INITIAL: FeatState = { ok: false };
const DRAFT_KEY = "degenff:feat-draft:v1";
const DRAFT_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days

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

type Draft = {
  savedAt: number;
  title: string;
  slug: string;
  slugTouched: boolean;
  summary: string;
  bodyMd: string;
  repoUrl: string;
  demoUrl: string;
  tags: string;
};

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d.savedAt || Date.now() - d.savedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

function timeAgo(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function NewFeatForm() {
  const [state, formAction, pending] = useActionState(submitFeat, INITIAL);

  const [title, setTitle] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugCustom, setSlugCustom] = useState("");
  const slug = slugTouched ? slugCustom : clientSlugify(title);

  const [summary, setSummary] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [tags, setTags] = useState("");

  // Draft banner + autosave
  const [foundDraft, setFoundDraft] = useState<Draft | null>(null);
  const [draftStatus, setDraftStatus] = useState<string>("");
  const draftLoadedRef = useRef(false);

  useEffect(() => {
    if (draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    const d = loadDraft();
    // Show the "saved draft" banner on first mount only — intentional one-time
    // state set after reading localStorage (which is browser-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (d && (d.title || d.bodyMd || d.summary)) setFoundDraft(d);
  }, []);

  function restoreDraft(d: Draft) {
    setTitle(d.title);
    setSlugTouched(d.slugTouched);
    setSlugCustom(d.slug);
    setSummary(d.summary);
    setBodyMd(d.bodyMd);
    setRepoUrl(d.repoUrl);
    setDemoUrl(d.demoUrl);
    setTags(d.tags);
    setFoundDraft(null);
    setDraftStatus("restored");
  }

  function discardDraft() {
    if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    setFoundDraft(null);
    setDraftStatus("discarded");
  }

  // Debounced autosave on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      const draft: Draft = {
        savedAt: Date.now(),
        title, slug: slugCustom, slugTouched,
        summary, bodyMd, repoUrl, demoUrl, tags,
      };
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setDraftStatus(`saved · ${new Date().toLocaleTimeString()}`);
      } catch {
        setDraftStatus("save failed");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [title, slugCustom, slugTouched, summary, bodyMd, repoUrl, demoUrl, tags]);

  // Clear draft on successful submit (state.ok signals server accepted)
  useEffect(() => {
    if (state.ok && typeof window !== "undefined") {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, [state.ok]);

  // Preview
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewPending, startPreviewTransition] = useTransition();

  const refreshPreview = useCallback(() => {
    startPreviewTransition(async () => {
      const { html } = await previewMarkdownAction(bodyMd);
      setPreviewHtml(html);
    });
  }, [bodyMd]);

  useEffect(() => {
    if (mode === "preview") refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <form action={formAction} className="submit-form">
      {foundDraft && (
        <div className="draft-banner" role="status">
          <span>
            <strong>Saved draft found</strong> ({timeAgo(foundDraft.savedAt)}).
            {foundDraft.title && <> Title: <em>{foundDraft.title.slice(0, 60)}</em>.</>}
          </span>
          <div className="draft-banner-actions">
            <button type="button" className="btn" onClick={() => restoreDraft(foundDraft)}>Restore</button>
            <button type="button" className="btn ghost" onClick={discardDraft}>Discard</button>
          </div>
        </div>
      )}

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
          onChange={(e) => { setSlugTouched(true); setSlugCustom(e.target.value); }}
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
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What it is, in one sentence."
        />
      </div>

      <div className="field">
        <label htmlFor="hero">Hero image <em>(optional)</em></label>
        <input id="hero" name="hero" type="file" accept="image/*" />
        <small>JPEG/PNG/WebP/AVIF/GIF, max 24MB. EXIF stripped.</small>
      </div>

      <div className="field">
        <div className="md-tabs">
          <label htmlFor="bodyMd" style={{ marginRight: "auto" }}>Writeup (Markdown)</label>
          <button
            type="button"
            className={`md-tab${mode === "edit" ? " is-active" : ""}`}
            onClick={() => setMode("edit")}
          >
            Write
          </button>
          <button
            type="button"
            className={`md-tab${mode === "preview" ? " is-active" : ""}`}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
          {mode === "preview" && (
            <button type="button" className="md-tab" onClick={refreshPreview} disabled={previewPending}>
              {previewPending ? "…" : "Refresh"}
            </button>
          )}
        </div>

        {mode === "edit" ? (
          <textarea
            id="bodyMd"
            name="bodyMd"
            rows={18}
            maxLength={200_000}
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            placeholder="## What it is

A few paragraphs about why you built it and how it went.

## Stack

- node
- postgres
- a Dell R630

## What broke

The first build. The second build. The third build."
          />
        ) : (
          <>
            {/* Hidden so the form still submits bodyMd in preview mode */}
            <input type="hidden" name="bodyMd" value={bodyMd} />
            <div className="md-preview feat-body">
              {previewHtml
                ? <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                : <p className="md-preview-empty">{previewPending ? "Rendering…" : "Nothing to preview yet."}</p>}
            </div>
          </>
        )}
        <small>
          Headings, lists, links, code blocks, tables, blockquotes. Inline HTML is sanitized.
          Preview renders through the same pipeline used at save time.
        </small>
      </div>

      <div className="field">
        <label htmlFor="repoUrl">Repo URL <em>(optional)</em></label>
        <input
          id="repoUrl"
          name="repoUrl"
          type="url"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/…"
          maxLength={2000}
        />
      </div>

      <div className="field">
        <label htmlFor="demoUrl">Demo URL <em>(optional)</em></label>
        <input
          id="demoUrl"
          name="demoUrl"
          type="url"
          value={demoUrl}
          onChange={(e) => setDemoUrl(e.target.value)}
          placeholder="https://…"
          maxLength={2000}
        />
      </div>

      <div className="field">
        <label htmlFor="tags">Tags</label>
        <input
          id="tags"
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="comma, separated, tags"
        />
        <small>Max 12 tags.</small>
      </div>

      {state.error && (
        <p className="form-error" role="alert">
          <strong>Rejected:</strong> {state.error}
        </p>
      )}

      <div className="submit-row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit Feat"}
        </button>
        <span className="draft-status">{draftStatus ? `draft: ${draftStatus}` : ""}</span>
      </div>
    </form>
  );
}
