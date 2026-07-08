import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { requireOps } from "@/lib/ops/auth";
import { getAllServiceStatuses, formatUptime } from "@/lib/ops/systemd";
import { getBotIdentity, listGuildChannels } from "@/lib/ops/discord-rest";
import MemberSearch from "./MemberSearch";
import AnnounceForm from "./AnnounceForm";

export const metadata = { title: "Ops · Discord" };

export default async function DiscordOpsPage() {
  const user = await requireOps();
  const isAdmin = user.role === "admin";

  const [services, identity, channels, staff] = await Promise.all([
    getAllServiceStatuses(),
    getBotIdentity().catch((e: Error) => ({ error: e.message })),
    listGuildChannels().catch((e: Error) => ({ error: e.message })),
    db.query.users.findMany({
      where: (u, { or }) => or(eq(u.role, "admin"), eq(u.role, "mod")),
      orderBy: (u) => [desc(u.role), u.handle],
    }),
  ]);

  const bot = services.find((s) => s.unit === "degenff-bot");
  const textChannels = Array.isArray(channels)
    ? channels.filter((c) => c.type === 0 || c.type === 5).sort((a, b) => a.position - b.position)
    : [];

  return (
    <>
      <header className="ops-panel-head">
        <h2>Discord</h2>
        <p className="ops-panel-sub">
          Bot status, member roles, and announce. {isAdmin ? "Admins can override roles and post." : "Mods see read-only."}
        </p>
      </header>

      <section className="ops-section ops-bot-card">
        <div className="ops-bot-id">
          {"id" in identity ? (
            <>
              <h3>{identity.global_name || identity.username}</h3>
              <p className="mono ops-bot-meta">@{identity.username} · {identity.id}</p>
            </>
          ) : (
            <>
              <h3>Bot identity unavailable</h3>
              <p className="ops-error">{identity.error}</p>
            </>
          )}
        </div>
        <dl className="kv ops-bot-kv">
          <div><dt>Process</dt><dd>
            <span className={`status-pill ${bot?.activeState === "active" ? "ok" : "bad"}`}>
              {bot?.activeState ?? "unknown"}
            </span>
          </dd></div>
          <div><dt>Uptime</dt><dd>{formatUptime(bot?.activeForMs ?? null)}</dd></div>
          <div><dt>Guild</dt><dd className="mono">{process.env.DISCORD_GUILD_ID ?? "—"}</dd></div>
          <div><dt>Staff in DB</dt><dd>{staff.length}</dd></div>
        </dl>
      </section>

      <section className="ops-section">
        <h3 className="ops-section-h">Current staff</h3>
        <ul className="ops-staff-list">
          {staff.map((s) => (
            <li key={s.id}>
              <span className={`ops-role-pill role-${s.role}`}>{s.role}</span>
              <span className="ops-staff-handle">@{s.handle}</span>
              <span className="mono ops-staff-id">{s.discordId ?? "—"}</span>
              {s.banned && <span className="ops-tag banned">BANNED</span>}
            </li>
          ))}
          {staff.length === 0 && <li className="ops-members-empty">No mods or admins yet.</li>}
        </ul>
      </section>

      <section className="ops-section">
        <h3 className="ops-section-h">Member search + role override</h3>
        <MemberSearch canWrite={isAdmin} />
      </section>

      <section className="ops-section">
        <h3 className="ops-section-h">Post announcement as bot</h3>
        {textChannels.length === 0 ? (
          <p className="ops-error">No channels available{"error" in channels ? `: ${channels.error}` : ""}.</p>
        ) : (
          <AnnounceForm channels={textChannels.map((c) => ({ id: c.id, name: c.name }))} disabled={!isAdmin} />
        )}
      </section>
    </>
  );
}
