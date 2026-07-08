import { requireOps } from "@/lib/ops/auth";
import DeployPanel from "./DeployPanel";
import LogTail from "./LogTail";

export const metadata = { title: "Ops · Deploy + Logs" };

export default async function DeployLogsPage() {
  const user = await requireOps();
  return (
    <>
      <header className="ops-panel-head">
        <h2>Deploy + Logs</h2>
        <p className="ops-panel-sub">
          Rebuild and restart the web. Tail systemd journals for any service.
        </p>
      </header>

      <section className="ops-section">
        <h3 className="ops-section-h">Redeploy</h3>
        <DeployPanel disabled={user.role !== "admin"} />
      </section>

      <section className="ops-section">
        <h3 className="ops-section-h">Live logs</h3>
        <LogTail />
      </section>
    </>
  );
}
