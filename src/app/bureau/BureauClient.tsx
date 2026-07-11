"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fileForm, type FileFormResult } from "@/app/actions/bureau";
import { BUREAU_FORMS, MAX_FILING_CHARS } from "@/lib/bureau-shared";

const RULING_POLL_MS = 20_000;

export default function BureauClient({
  signedIn,
  pollForRulings,
}: {
  signedIn: boolean;
  pollForRulings: boolean;
}) {
  const router = useRouter();
  const [formCode, setFormCode] = useState(BUREAU_FORMS[0].code);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FileFormResult | null>(null);

  // The clerk rules on its own schedule; refresh the docket while anything
  // is still in the tray so rulings appear without a manual reload.
  useEffect(() => {
    if (!pollForRulings) return;
    const id = window.setInterval(() => router.refresh(), RULING_POLL_MS);
    return () => window.clearInterval(id);
  }, [pollForRulings, router]);

  const selected = BUREAU_FORMS.find((f) => f.code === formCode) ?? BUREAU_FORMS[0];

  async function submit() {
    if (busy || !signedIn) return;
    setBusy(true);
    setResult(null);
    const r = await fileForm({ formCode, body });
    setResult(r);
    if (r.ok) {
      setBody("");
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="bureau-window">
      <div className="bureau-forms" role="radiogroup" aria-label="Select a form">
        {BUREAU_FORMS.map((f) => (
          <button
            key={f.code}
            type="button"
            role="radio"
            aria-checked={f.code === formCode}
            className={`bureau-form-card${f.code === formCode ? " is-selected" : ""}`}
            onClick={() => setFormCode(f.code)}
          >
            <span className="bureau-form-code">FORM {f.code}</span>
            <span className="bureau-form-title">{f.title}</span>
            <span className="bureau-form-blurb">{f.blurb}</span>
          </button>
        ))}
      </div>

      <div className="bureau-plea">
        <label className="bureau-plea-label" htmlFor="bureau-plea">
          {selected.prompt}
        </label>
        <textarea
          id="bureau-plea"
          className="rooms-input"
          rows={4}
          maxLength={MAX_FILING_CHARS}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="in your own words. the clerk reads everything. allegedly."
          disabled={!signedIn || busy}
        />
        <div className="bureau-plea-row">
          <span className="bureau-plea-count">{body.length}/{MAX_FILING_CHARS}</span>
          <button
            type="button"
            className="btn"
            onClick={() => void submit()}
            disabled={!signedIn || busy || body.trim().length < 10}
          >
            {busy ? "Filing" : `File Form ${selected.code}`}
          </button>
        </div>
        {result && (
          <p className={`bureau-receipt${result.ok ? "" : " is-error"}`}>
            {result.ok ? result.receipt : result.error}
          </p>
        )}
      </div>
    </div>
  );
}
