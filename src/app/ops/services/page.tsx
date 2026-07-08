import { requireOps } from "@/lib/ops/auth";
import { getAllServiceStatuses, formatUptime, formatBytes } from "@/lib/ops/systemd";
import RestartButton from "./RestartButton";

function pillClass(state: string) {
  if (state === "active") return "ok";
  if (state === "activating" || state === "reloading") return "warn";
  return "bad";
}

export const metadata = { title: "Ops · Services" };

export default async function ServicesPage() {
  const user = await requireOps();
  const services = await getAllServiceStatuses();
  const isAdmin = user.role === "admin";

  return (
    <>
      <header className="ops-panel-head">
        <h2>Services</h2>
        <p className="ops-panel-sub">
          systemd units on the R630. {isAdmin ? "Admins can restart." : "Read-only for mods."}
        </p>
      </header>

      <div className="ops-services">
        {services.map((s) => (
          <article key={s.unit} className="ops-service">
            <div className="ops-service-head">
              <span className={`status-pill ${pillClass(s.activeState)}`}>
                {s.activeState}/{s.subState}
              </span>
              <h3>{s.unit}</h3>
              <RestartButton unit={s.unit} disabled={!isAdmin} />
            </div>
            <p className="ops-service-desc">{s.description}</p>
            <dl className="kv">
              <div><dt>Uptime</dt><dd>{formatUptime(s.activeForMs)}</dd></div>
              <div><dt>Since</dt><dd>{s.activeSince ? new Date(s.activeSince).toLocaleString() : "—"}</dd></div>
              <div><dt>PID</dt><dd>{s.mainPid ?? "—"}</dd></div>
              <div><dt>Memory</dt><dd>{formatBytes(s.memoryBytes)}</dd></div>
              <div><dt>Load</dt><dd>{s.loadState}</dd></div>
              <div><dt>Enabled</dt><dd>{s.unitFileState}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
