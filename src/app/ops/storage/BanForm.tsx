"use client";

import { useActionState } from "react";
import { banUserAction, type BanState } from "../actions/storage";

export default function BanForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState<BanState | null, FormData>(
    banUserAction,
    null,
  );

  if (disabled) {
    return <p className="ops-locked-note"><span className="ops-locked">Admin only</span> — bans block the user site-wide.</p>;
  }

  return (
    <form action={formAction} className="ops-ban">
      <label className="ops-field">
        <span>User</span>
        <input
          type="text"
          name="ident"
          required
          placeholder="@handle or Discord ID"
          autoComplete="off"
          maxLength={64}
        />
      </label>
      <label className="ops-field">
        <span>Reason (visible to mods)</span>
        <input type="text" name="reason" maxLength={500} placeholder="why" />
      </label>
      <div className="ops-form-row">
        <button type="submit" className="btn">
          {pending ? "…" : "Ban"}
        </button>
        <button type="submit" name="unban" value="1" className="btn ghost">
          Unban
        </button>
        {state && (
          <span className={`ops-form-status ${state.ok ? "ok" : "bad"}`}>
            {state.ok ? "✔" : "✘"} {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
