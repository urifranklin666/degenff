"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import {
  bulkQueueAction,
  singleQueueAction,
  type QueueAction,
  type QueueKind,
  type QueueResult,
} from "../actions/queue";
import type { ActionResult } from "@/lib/ops/queue";

export type PendingSub = {
  id: string;
  title: string;
  medium: string;
  nsfw: boolean;
  authorHandle: string;
  createdAt: string;
  tags: string[];
  hasFiles: boolean;
  thumbPath: string | null;
  bodyExcerpt: string;
};

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

const SUB_ACTIONS: ReadonlyArray<{ value: QueueAction; label: string; tone: string }> = [
  { value: "approve",  label: "Approve",   tone: "approve"  },
  { value: "feature",  label: "Feature",   tone: "feature"  },
  { value: "reject",   label: "Reject",    tone: "reject"   },
  { value: "withdraw", label: "Withdraw",  tone: "withdraw" },
];

const FEAT_ACTIONS = SUB_ACTIONS.filter((a) => a.value !== "unfeature");

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

export default function QueueClient({ subs, feats }: { subs: PendingSub[]; feats: PendingFeat[] }) {
  return (
    <div className="queue-stack">
      <QueueSection kind="sub" title="Submissions" items={subs} renderRow={(s) => <SubRow s={s} />} />
      <QueueSection kind="feat" title="Feats" items={feats} renderRow={(f) => <FeatRow f={f} />} />
    </div>
  );
}

/* ── one section (subs or feats) ─────────────────────────────────────── */

type RowItem = { id: string };

function QueueSection<T extends RowItem>({
  kind,
  title,
  items,
  renderRow,
}: {
  kind: QueueKind;
  title: string;
  items: T[];
  renderRow: (item: T) => React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, ActionResult>>({});
  const [armed, setArmed] = useState<QueueAction | null>(null);
  const [summary, setSummary] = useState<QueueResult | null>(null);
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0;
  const actionList = kind === "sub" ? SUB_ACTIONS : FEAT_ACTIONS;

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
      const r = await bulkQueueAction({ kind, action, ids });
      setResults((prev) => ({ ...prev, ...r.perId }));
      setSummary(r);
      setSelected(new Set());
      setArmed(null);
    });
  }

  function runSingle(id: string, action: QueueAction) {
    startTransition(async () => {
      const r = await singleQueueAction({ kind, action, id });
      setResults((prev) => ({ ...prev, [id]: r }));
    });
  }

  if (items.length === 0) {
    return (
      <section className="queue-section">
        <header className="queue-section-head">
          <h3>{title}</h3>
          <span className="queue-count empty">queue clear</span>
        </header>
        <p className="queue-empty">Nothing pending. Good.</p>
      </section>
    );
  }

  return (
    <section className="queue-section">
      <header className="queue-section-head">
        <h3>{title}</h3>
        <span className="queue-count">{items.length} pending</span>
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
          {actionList.map((a) => (
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
        {items.map((item) => {
          const isSelected = selected.has(item.id);
          const result = results[item.id];
          const isDone = result?.ok === true;
          return (
            <li
              key={item.id}
              className={`queue-row${isSelected ? " is-selected" : ""}${isDone ? " is-done" : ""}`}
            >
              <label className="queue-row-check">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(item.id)}
                  disabled={pending || isDone}
                  aria-label={`Select ${item.id}`}
                />
              </label>
              <div className="queue-row-body">{renderRow(item)}</div>
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
                    {actionList.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => runSingle(item.id, a.value)}
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

/* ── row body renderers ──────────────────────────────────────────────── */

function SubRow({ s }: { s: PendingSub }) {
  return (
    <>
      {s.thumbPath ? (
        <Image
          src={`/uploads/${s.thumbPath}`}
          alt=""
          width={64}
          height={64}
          className="queue-thumb"
          unoptimized
        />
      ) : (
        <div className="queue-thumb queue-thumb-empty" aria-hidden>{s.medium[0]?.toUpperCase()}</div>
      )}
      <div className="queue-row-meta">
        <div className="queue-row-title">
          <a href={`/submissions/${s.id}`} target="_blank" rel="noreferrer">{s.title}</a>
          {s.nsfw && <span className="ops-tag banned" style={{ marginLeft: "0.4rem" }}>NSFW</span>}
        </div>
        <div className="queue-row-sub">
          <span>@{s.authorHandle}</span>
          <span className="queue-tag-medium">{s.medium}</span>
          <span className="queue-age">{timeAgo(s.createdAt)} ago</span>
          {s.tags.slice(0, 4).map((t) => (
            <span key={t} className="queue-tag">{t}</span>
          ))}
        </div>
        {s.bodyExcerpt && <p className="queue-row-excerpt">{s.bodyExcerpt}</p>}
      </div>
    </>
  );
}

function FeatRow({ f }: { f: PendingFeat }) {
  return (
    <>
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
    </>
  );
}
