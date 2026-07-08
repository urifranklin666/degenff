"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  searchMembersAction,
  setSiteRoleAction,
  type MemberRow,
} from "../actions/discord";

const ROLES = [
  { value: "contributor", label: "contributor" },
  { value: "mod", label: "mod" },
  { value: "admin", label: "admin" },
] as const;

export default function MemberSearch({ canWrite }: { canWrite: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const next = await searchMembersAction(query);
      setResults(next);
      setSearched(true);
    });
  }

  function onSetRole(discordId: string, role: "contributor" | "mod" | "admin") {
    setStatus((s) => ({ ...s, [discordId]: "…" }));
    startTransition(async () => {
      const r = await setSiteRoleAction({ discordId, role });
      setStatus((s) => ({ ...s, [discordId]: r.ok ? `✔ ${r.newRole}` : `✘ ${r.message}` }));
      if (r.ok) {
        setResults((rs) =>
          rs.map((m) => (m.discordId === discordId ? { ...m, siteRole: role } : m)),
        );
      }
    });
  }

  return (
    <div className="ops-members">
      <form onSubmit={onSearch} className="ops-members-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username, nickname, or discriminator"
          autoComplete="off"
          maxLength={64}
        />
        <button type="submit" className="btn ghost" disabled={pending}>
          {pending ? "…" : "Search"}
        </button>
      </form>

      {searched && results.length === 0 && (
        <p className="ops-members-empty">No matches.</p>
      )}

      <ul className="ops-members-list">
        {results.map((m) => (
          <li key={m.discordId} className="ops-member">
            <div className="ops-member-id">
              {m.avatar ? (
                <Image src={m.avatar} alt="" width={40} height={40} className="ops-member-avatar" unoptimized />
              ) : (
                <div className="ops-member-avatar ops-member-avatar-empty" aria-hidden>?</div>
              )}
              <div>
                <div className="ops-member-name">
                  {m.displayName}
                  {m.isBot && <span className="ops-tag bot">BOT</span>}
                  {m.banned && <span className="ops-tag banned">BANNED</span>}
                </div>
                <div className="ops-member-meta">
                  @{m.username} · <span className="mono">{m.discordId}</span>
                  {m.handle && m.handle !== m.username && <> · site @{m.handle}</>}
                </div>
              </div>
            </div>

            <div className="ops-member-roles">
              <span className={`ops-role-pill role-${m.siteRole ?? "none"}`}>
                {m.siteRole ?? "—"}
              </span>
              {canWrite ? (
                <select
                  defaultValue={m.siteRole ?? "contributor"}
                  onChange={(e) => onSetRole(m.discordId, e.target.value as "contributor" | "mod" | "admin")}
                  disabled={pending || m.isBot}
                  aria-label={`Set role for ${m.displayName}`}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              ) : (
                <span className="ops-locked">read-only</span>
              )}
              {status[m.discordId] && (
                <span className={`ops-member-status ${status[m.discordId].startsWith("✔") ? "ok" : "bad"}`}>
                  {status[m.discordId]}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
