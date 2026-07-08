"use client";

import { useActionState } from "react";
import { announceAction, type AnnounceState } from "../actions/discord";

type Channel = { id: string; name: string };

export default function AnnounceForm({ channels, disabled }: { channels: Channel[]; disabled: boolean }) {
  const [state, formAction, pending] = useActionState<AnnounceState | null, FormData>(
    announceAction,
    null,
  );

  if (disabled) {
    return <p className="ops-locked-note"><span className="ops-locked">Admin only</span> — posting as the bot is a public action.</p>;
  }

  return (
    <form action={formAction} className="ops-announce">
      <label className="ops-field">
        <span>Channel</span>
        <select name="channelId" required>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>#{c.name}</option>
          ))}
        </select>
      </label>
      <label className="ops-field">
        <span>Message</span>
        <textarea
          name="content"
          rows={4}
          maxLength={1900}
          required
          placeholder="Posts as the bot. Markdown ok."
        />
      </label>
      <div className="ops-form-row">
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Posting…" : "Post as bot"}
        </button>
        {state && (
          <span className={`ops-form-status ${state.ok ? "ok" : "bad"}`}>
            {state.ok ? `✔ ${state.message} (msg ${state.messageId})` : `✘ ${state.message}`}
          </span>
        )}
      </div>
    </form>
  );
}
