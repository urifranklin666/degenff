"use client";

import { useState, useTransition } from "react";
import { scanOrphansAction } from "../actions/storage";
import type { OrphanScan } from "@/lib/ops/storage";

export default function OrphanScanPanel({ disabled }: { disabled: boolean }) {
  const [result, setResult] = useState<OrphanScan | null>(null);
  const [pending, startTransition] = useTransition();

  if (disabled) {
    return <p className="ops-locked-note"><span className="ops-locked">Admin only</span> — full FS walk.</p>;
  }

  function runScan() {
    startTransition(async () => {
      const r = await scanOrphansAction();
      setResult(r);
    });
  }

  return (
    <div className="ops-orphans">
      <button type="button" className="btn ghost" onClick={runScan} disabled={pending}>
        {pending ? "Scanning…" : "Scan for orphan files"}
      </button>
      {result && (
        <div className="ops-orphans-result">
          <dl className="kv">
            <div><dt>Files scanned</dt><dd>{result.scannedFiles}</dd></div>
            <div><dt>Referenced</dt><dd>{result.referenced}</dd></div>
            <div><dt>Orphans</dt><dd>{result.orphans.length}{result.orphans.length === 500 && "+"}</dd></div>
            <div><dt>Duration</dt><dd>{result.durationMs} ms</dd></div>
          </dl>
          {result.orphans.length > 0 && (
            <details className="ops-orphans-list">
              <summary>Show orphan paths ({result.orphans.length})</summary>
              <pre>{result.orphans.join("\n")}</pre>
              <p className="ops-fineprint">
                Deletion is intentionally not wired here — review the list, then remove via shell. Avoids one-click loss.
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
