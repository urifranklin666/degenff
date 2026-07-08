"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { tailLogsAction, type TailState } from "../actions/deploy";

const UNITS = ["degenff-web", "degenff-bot", "cloudflared"] as const;
const LINE_OPTS = [100, 200, 500, 1000];

function priorityClass(p: string | undefined): "err" | "warn" | "info" | "" {
  const n = Number(p);
  if (!Number.isFinite(n)) return "";
  if (n <= 3) return "err";
  if (n === 4) return "warn";
  if (n >= 6) return "info";
  return "";
}

export default function LogTail() {
  const [unit, setUnit] = useState<string>("degenff-web");
  const [lines, setLines] = useState<number>(200);
  const [grep, setGrep] = useState("");
  const [priority, setPriority] = useState<"all" | "err" | "warning" | "info">("all");
  const [auto, setAuto] = useState(false);
  const [state, setState] = useState<TailState | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function refresh() {
    startTransition(async () => {
      const next = await tailLogsAction({ unit, lines, grep, priority });
      setState(next);
    });
  }

  // initial + on-change reload
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, lines, grep, priority]);

  // auto-refresh toggle
  useEffect(() => {
    if (!auto) {
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
      return;
    }
    timer.current = setInterval(() => refresh(), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, unit, lines, grep, priority]);

  return (
    <div className="ops-logtail">
      <div className="ops-logtail-controls">
        <label>
          <span>Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label>
          <span>Lines</span>
          <select value={lines} onChange={(e) => setLines(Number(e.target.value))}>
            {LINE_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
            <option value="all">all</option>
            <option value="info">info+</option>
            <option value="warning">warning+</option>
            <option value="err">errors</option>
          </select>
        </label>
        <label className="ops-logtail-grep">
          <span>Grep</span>
          <input
            type="text"
            value={grep}
            onChange={(e) => setGrep(e.target.value)}
            placeholder="regex…"
            maxLength={200}
          />
        </label>
        <label className="ops-logtail-auto">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span>auto (5s)</span>
        </label>
        <button type="button" className="btn ghost" onClick={refresh} disabled={pending}>
          {pending ? "…" : "Refresh"}
        </button>
      </div>

      {state?.error && <div className="ops-logtail-error">✘ {state.error}</div>}

      <pre className="ops-logtail-body" aria-live="polite">
        {state?.entries.length === 0 && !state.error && <span className="ops-logtail-empty">(no entries)</span>}
        {state?.entries.map((e, i) => (
          <div key={i} className={`ops-log-row ${priorityClass(e.priority)}`}>
            <span className="ts">{e.timestamp ? e.timestamp.slice(11, 19) : ""}</span>
            <span className="msg">{e.message}</span>
          </div>
        ))}
      </pre>

      {state?.fetchedAt && (
        <p className="ops-logtail-foot">
          {state.entries.length} entries · fetched {new Date(state.fetchedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
