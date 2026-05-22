"use client";

// DeGENERATE — export dialog: download or hand off to /submit.
import { useEffect, useState } from "react";
import type { ExportFormat } from "@/lib/degenerate/types";
import { Field, Segmented, Slider } from "./Controls";

export function ExportModal({
  open,
  docW,
  docH,
  busy,
  error,
  onClose,
  onDownload,
  onSendToSubmit,
}: {
  open: boolean;
  docW: number;
  docH: number;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onDownload: (format: ExportFormat, scale: number, quality: number) => void;
  onSendToSubmit: (format: ExportFormat, scale: number, quality: number) => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState(1);
  const [quality, setQuality] = useState(0.92);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;
  const lossy = format !== "png";
  const outW = Math.round(docW * scale);
  const outH = Math.round(docH * scale);

  return (
    <div className="dg-modal-veil" onClick={() => !busy && onClose()}>
      <div
        className="dg-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export image"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dg-modal-head">
          <h2>
            Export <span aria-hidden>↗</span>
          </h2>
          <button type="button" className="dg-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="dg-modal-body">
          <Field label="Format">
            <Segmented
              value={format}
              onChange={(v) => setFormat(v as ExportFormat)}
              options={[
                { label: "PNG", value: "png" },
                { label: "JPEG", value: "jpeg" },
                { label: "WebP", value: "webp" },
              ]}
            />
          </Field>

          <Field label="Scale">
            <Segmented
              value={String(scale)}
              onChange={(v) => setScale(parseFloat(v))}
              options={[
                { label: "0.5×", value: "0.5" },
                { label: "1×", value: "1" },
                { label: "2×", value: "2" },
              ]}
            />
          </Field>

          {lossy && (
            <Slider label="Quality" value={quality} min={0.4} max={1} step={0.01} onChange={setQuality} />
          )}

          <p className="dg-export-dims">
            Output <strong>{outW}</strong> × <strong>{outH}</strong> px · {format.toUpperCase()}
          </p>

          {error && <p className="dg-export-error">{error}</p>}
        </div>

        <div className="dg-modal-foot">
          <button
            type="button"
            className="dg-btn dg-btn-ghost"
            disabled={busy}
            onClick={() => onDownload(format, scale, lossy ? quality : 1)}
          >
            {busy ? "Rendering…" : "Download"}
          </button>
          <button
            type="button"
            className="dg-btn dg-btn-primary"
            disabled={busy}
            onClick={() => onSendToSubmit(format, scale, lossy ? quality : 1)}
          >
            {busy ? "Rendering…" : "Send to Submissions ↗"}
          </button>
        </div>
      </div>
    </div>
  );
}
