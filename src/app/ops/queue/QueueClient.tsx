"use client";

import { useMemo, useState, useTransition } from "react";
import {
  bulkQueueAction,
  singleQueueAction,
  type QueueAction,
  type QueueResult,
} from "../actions/queue";
import type { ActionResult } from "@/lib/ops/queue";

export type PendingFeat = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  authorHandle: string;
  createdAt: string;
  repoUrl: string | null;
  demoUrl: string | null;
};

const FEAT_ACTIONS: ReadonlyArray<{ value: QueueAction; label: string; tone: string }> = [
  { value: "approve",  label: "Approve",   tone: "approve"  },
  { value: "feature",  label: "Feature",   tone: "feature"  },
  { value: "reject",   label: "Reject",    tone: "reject"   },
  { value: "withdraw", label: "Withdraw",  tone: "withdraw" },
];

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export default function QueueClient({ feats }: { feats: PendingFeat[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, ActionResult>>({});
  const [armed, setArmed] = useState<QueueAction | null>(null);
  const [summary, setSummary] = useState<QueueResult | null>(null);
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(() => feats.map((i) => i.id), [feats]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setArmed(null);
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)));
    setArmed(null);
  }

  function runBulk(action: QueueAction) {
    if (armed !== action) {
      setArmed(action);
      return;
    }
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      const r = await bulkQueueAction({ kind: "feat", action, ids });
      setResults((prev) => ({ ...prev, ...r.perId }));
      setSummary(r);
      setSelected(new Set());
      setArmed(null);
    });
  }

  function runSingle(id: string, action: QueueAction) {
    startTransition(async () => {
      const r = await singleQueueAction({ kind: "feat", action, id });
      setResults((prev) => ({ ...prev, [id]: r }));
    });
  }

  if (feats.length === 0) {
    return (
      <section className="queue-section">
        <header className="queue-section-head">
          <h3>Feats</h3>
          <span className="queue-count empty">queue clear</span>
        </header>
        <p className="queue-empty">Nothing pending. Good.</p>
      </section>
    );
  }

  return (
    <section className="queue-section">
      <header className="queue-section-head">
        <h3>Feats</h3>
        <span className="queue-count">{feats.length} pending</span>
      </header>

      <div className="queue-bulk-bar" aria-live="polite">
        <label className="queue-select-all">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
            onChange={toggleAll}
          />
          <span>
            {selected.size > 0 ? `${selected.size} selected` : "select all"}
          </span>
        </label>
        <div className="queue-bulk-actions">
          {FEAT_ACTIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => runBulk(a.value)}
              disabled={!someSelected || pending}
              className={`queue-btn queue-btn-${a.tone}${armed === a.value ? " is-armed" : ""}`}
            >
              {armed === a.value ? `Confirm: ${a.label} ${selected.size}` : a.label}
            </button>
          ))}
          {armed && (
            <button
              type="button"
              onClick={() => setArmed(null)}
              className="queue-btn queue-btn-cancel"
              disabled={pending}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {summary && (
        <div className={`queue-summary ${summary.failed > 0 ? "bad" : "ok"}`}>
          {summary.ok} ok · {summary.noChange} unchanged · {summary.failed} failed
        </div>
      )}

      <ul className="queue-list">
        {feats.map((f) => {
          const isSelected = selected.has(f.id);
          const result = results[f.id];
          const isDone = result?.ok === true;
          return (
            <li
              key={f.id}
              className={`queue-row${isSelected ? " is-selected" : ""}${isDone ? " is-done" : ""}`}
            >
              <label className="queue-row-check">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(f.id)}
                  disabled={pending || isDone}
                  aria-label={`Select ${f.id}`}
                />
              </label>
              <div className="queue-row-body">
                <div className="queue-thumb queue-thumb-empty" aria-hidden>⬢</div>
                <div className="queue-row-meta">
                  <div className="queue-row-title">
                    <a href={`/feats/${f.slug}`} target="_blank" rel="noreferrer">{f.title}</a>
                  </div>
                  <div className="queue-row-sub">
                    <span>@{f.authorHandle}</span>
                    <span className="queue-age">{timeAgo(f.createdAt)} ago</span>
                    {f.repoUrl && <a href={f.repoUrl} target="_blank" rel="noreferrer" className="queue-tag">repo</a>}
                    {f.demoUrl && <a href={f.demoUrl} target="_blank" rel="noreferrer" className="queue-tag">demo</a>}
                  </div>
                  {f.summary && <p className="queue-row-excerpt">{f.summary}</p>}
                </div>
              </div>
              <div className="queue-row-side">
                {result && (
                  <span
                    className={`queue-row-result ${
                      result.ok ? "ok" : result.reason === "no-change" ? "skip" : "bad"
                    }`}
                  >
                    {result.ok ? "✔ done" : result.reason === "no-change" ? "⊘ unchanged" : `✘ ${result.reason ?? "failed"}`}
                  </span>
                )}
                {!isDone && (
                  <div className="queue-row-actions">
                    {FEAT_ACTIONS.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => runSingle(f.id, a.value)}
                        disabled={pending}
                        className={`queue-mini queue-mini-${a.tone}`}
                        title={a.label}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
