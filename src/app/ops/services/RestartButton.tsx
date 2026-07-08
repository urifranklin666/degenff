"use client";

import { useActionState, useState } from "react";
import { restartServiceAction, type RestartState } from "../actions/services";

export default function RestartButton({ unit, disabled }: { unit: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState<RestartState | null, FormData>(
    restartServiceAction,
    null,
  );
  const [armed, setArmed] = useState(false);

  if (disabled) {
    return <span className="ops-locked" title="Admin only">locked</span>;
  }

  return (
    <form action={formAction} className="ops-restart">
      <input type="hidden" name="unit" value={unit} />
      {!armed ? (
        <button
          type="button"
          className="btn ghost ops-restart-arm"
          onClick={() => setArmed(true)}
        >
          Restart
        </button>
      ) : (
        <>
          <button
            type="submit"
            className="btn ops-restart-confirm"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Restarting…" : "Confirm restart"}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setArmed(false)}
            disabled={pending}
          >
            Cancel
          </button>
        </>
      )}
      {state && (
        <span className={`ops-restart-result ${state.ok ? "ok" : "bad"}`}>
          {state.ok ? "✔" : "✘"} {state.message || (state.ok ? "restarted" : "failed")}
        </span>
      )}
    </form>
  );
}
