"use client";

import { useActionState } from "react";
import { submitWork, type SubmitState } from "@/app/actions/submit";

const INITIAL: SubmitState = { ok: false };

export default function SubmitForm() {
  const [state, formAction, pending] = useActionState(submitWork, INITIAL);

  return (
    <form action={formAction} className="submit-form">
      <div className="field">
        <label htmlFor="medium">Medium</label>
        <select id="medium" name="medium" defaultValue="image" required>
          <option value="image">image</option>
          <option value="audio">audio</option>
          <option value="video">video</option>
          <option value="text">text</option>
          <option value="code">code</option>
          <option value="link">link</option>
          <option value="mixed">mixed</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required maxLength={200} placeholder="What you made (one line)" />
      </div>

      <div className="field">
        <label htmlFor="files">Files</label>
        <input id="files" name="files" type="file" multiple accept="image/*,audio/*,video/*" />
        <small>
          24MB images · 48MB audio · 60MB video. EXIF gets stripped. GIF, JPEG, PNG, WebP,
          AVIF, MP3, WAV, OGG, FLAC, MP4, WebM, MOV.
        </small>
      </div>

      <div className="field">
        <label htmlFor="linkUrl">Link URL <em>(if medium is link)</em></label>
        <input id="linkUrl" name="linkUrl" type="url" placeholder="https://…" maxLength={2000} />
      </div>

      <div className="field">
        <label htmlFor="body">Body / writeup</label>
        <textarea id="body" name="body" rows={8} maxLength={50_000} placeholder="Description, source, post-mortem, whatever." />
      </div>

      <div className="field">
        <label htmlFor="tags">Tags</label>
        <input id="tags" name="tags" placeholder="comma, separated, tags" />
        <small>Max 12 tags. lowercase. alphanumerics, dashes, underscores.</small>
      </div>

      <div className="field row">
        <label htmlFor="nsfw" className="checkbox">
          <input id="nsfw" name="nsfw" type="checkbox" />
          <span>This is NSFW</span>
        </label>
      </div>

      {state.error && (
        <p className="form-error" role="alert">
          <strong>Rejected:</strong> {state.error}
        </p>
      )}

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Drop In The Queue"}
      </button>
    </form>
  );
}
