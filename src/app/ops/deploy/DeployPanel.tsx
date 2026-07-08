"use client";

import { useActionState, useState } from "react";
import { deployAction } from "../actions/deploy";
import type { DeployResult } from "@/lib/ops/deploy";

export default function DeployPanel({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState<DeployResult | null, FormData>(
    async () => deployAction(),
    null,
  );
  const [armed, setArmed] = useState(false);

  if (disabled) {
    return (
      <div className="ops-deploy-locked">
        <span className="ops-locked">Admins only</span>
        <p>Triggers <code>ops/deploy.sh</code>: <code>next build</code> then restart <code>degenff-web</code>.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="ops-deploy">
      {!armed ? (
        <button type="button" className="btn ghost" onClick={() => setArmed(true)}>
          Stage deploy
        </button>
      ) : (
        <div className="ops-deploy-confirm">
          <p className="ops-deploy-warn">
            This runs <code>ops/deploy.sh</code> (build + restart web). Takes ~30–90s. Don&rsquo;t click twice.
          </p>
          <button type="submit" className="btn" disabled={pending} aria-busy={pending}>
            {pending ? "Deploying…" : "Run deploy"}
          </button>
          <button type="button" className="btn ghost" onClick={() => setArmed(false)} disabled={pending}>
            Cancel
          </button>
        </div>
      )}
      {state && (
        <div className={`ops-deploy-result ${state.ok ? "ok" : "bad"}`}>
          <div className="ops-deploy-meta">
            <span>{state.ok ? "✔ deploy ok" : `✘ deploy failed (exit ${state.exitCode ?? "?"})`}</span>
            <span>{Math.round(state.durationMs / 1000)}s · {new Date(state.startedAt).toLocaleTimeString()}</span>
          </div>
          <pre className="ops-deploy-output">{state.output || "(no output)"}</pre>
        </div>
      )}
    </form>
  );
}
