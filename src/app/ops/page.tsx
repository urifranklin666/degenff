import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireOps } from "@/lib/ops/auth";
import { getAllServiceStatuses, formatUptime } from "@/lib/ops/systemd";
import { uploadsStats } from "@/lib/ops/storage";

function dotForActive(state: string) {
  if (state === "active") return "ok";
  if (state === "activating" || state === "reloading") return "warn";
  return "bad";
}

export default async function OpsOverview() {
  const user = await requireOps();
  const [services, uploads, pending, mods] = await Promise.all([
    getAllServiceStatuses(),
    uploadsStats(),
    db.execute<{ c: string }>(
      sql`SELECT COUNT(*)::text AS c FROM submissions WHERE status = 'pending'`,
    ).then((r) => Number(r.rows?.[0]?.c ?? 0)),
    db.execute<{ c: string }>(
      sql`SELECT COUNT(*)::text AS c FROM users WHERE role IN ('mod', 'admin')`,
    ).then((r) => Number(r.rows?.[0]?.c ?? 0)),
  ]);

  const allUp = services.every((s) => s.activeState === "active");
  const botSvc = services.find((s) => s.unit === "degenff-bot");

  return (
    <>
      <div className="ops-grid">
        <Link href="/ops/services" className="ops-tile" prefetch={false}>
          <span className="ops-tile-head">
            <span className="ops-tile-glyph" aria-hidden>⬢</span>
            <span className="ops-tile-eyebrow">Services</span>
          </span>
          <span className={`ops-tile-value ${allUp ? "ok" : "bad"}`}>
            {allUp ? "All up" : `${services.filter((s) => s.activeState === "active").length}/${services.length}`}
          </span>
          <ul className="ops-tile-mini">
            {services.map((s) => (
              <li key={s.unit}>
                <span className={`status-dot ${dotForActive(s.activeState)}`} aria-hidden />
                <span className="kv-k">{s.unit}</span>
                <span className="kv-v">{s.activeState}</span>
              </li>
            ))}
          </ul>
        </Link>

        <Link href="/ops/discord" className="ops-tile" prefetch={false}>
          <span className="ops-tile-head">
            <span className="ops-tile-glyph" aria-hidden>◉</span>
            <span className="ops-tile-eyebrow">Bot</span>
          </span>
          <span className={`ops-tile-value ${botSvc?.activeState === "active" ? "ok" : "bad"}`}>
            {botSvc?.activeState === "active" ? "ONLINE" : "DOWN"}
          </span>
          <ul className="ops-tile-mini">
            <li><span className="kv-k">uptime</span><span className="kv-v">{formatUptime(botSvc?.activeForMs ?? null)}</span></li>
            <li><span className="kv-k">staff</span><span className="kv-v">{mods}</span></li>
          </ul>
        </Link>

        <Link href="/ops/storage" className="ops-tile" prefetch={false}>
          <span className="ops-tile-head">
            <span className="ops-tile-glyph" aria-hidden>⬡</span>
            <span className="ops-tile-eyebrow">Storage</span>
          </span>
          <span className="ops-tile-value">{uploads.human}</span>
          <ul className="ops-tile-mini">
            <li><span className="kv-k">files</span><span className="kv-v">{uploads.files ?? "—"}</span></li>
            <li><span className="kv-k">root</span><span className="kv-v">/var/lib/degenff/uploads</span></li>
          </ul>
        </Link>

        <Link href="/ops/queue" className="ops-tile" prefetch={false}>
          <span className="ops-tile-head">
            <span className="ops-tile-glyph" aria-hidden>◇</span>
            <span className="ops-tile-eyebrow">Queue</span>
          </span>
          <span className={`ops-tile-value ${pending > 0 ? "warn" : "ok"}`}>
            {pending}
          </span>
          <ul className="ops-tile-mini">
            <li><span className="kv-k">pending</span><span className="kv-v">submissions</span></li>
            <li><span className="kv-k">bulk</span><span className="kv-v">/ops/queue</span></li>
          </ul>
        </Link>
      </div>

      <p className="ops-fineprint">
        Signed in as <b>@{user.handle}</b> · role <b>{user.role}</b>.
        Mods see status read-only; admins can restart services, deploy, and override roles.
      </p>
    </>
  );
}
