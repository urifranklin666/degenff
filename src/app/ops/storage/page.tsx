import { requireOps } from "@/lib/ops/auth";
import { uploadsStats, tableCounts, humanBytes } from "@/lib/ops/storage";
import { listBanned } from "../actions/storage";
import OrphanScanPanel from "./OrphanScan";
import BanForm from "./BanForm";

export const metadata = { title: "Ops · Storage + DB" };

export default async function StoragePage() {
  const user = await requireOps();
  const isAdmin = user.role === "admin";

  const [uploads, tables, banned] = await Promise.all([
    uploadsStats(),
    tableCounts(),
    listBanned(),
  ]);

  const total = tables.reduce((acc, t) => acc + t.rows, 0);

  return (
    <>
      <header className="ops-panel-head">
        <h2>Storage + DB</h2>
        <p className="ops-panel-sub">
          Disk usage at <code>/var/lib/degenff/uploads</code>, row counts from <code>pg_stat_user_tables</code>, ban controls.
        </p>
      </header>

      <section className="ops-section">
        <h3 className="ops-section-h">Uploads</h3>
        <dl className="kv kv-cols">
          <div><dt>Total size</dt><dd>{uploads.human}</dd></div>
          <div><dt>Bytes</dt><dd className="mono">{uploads.bytes ?? "—"}</dd></div>
          <div><dt>Files</dt><dd>{uploads.files ?? "—"}</dd></div>
          <div><dt>Root</dt><dd className="mono">/var/lib/degenff/uploads</dd></div>
        </dl>
      </section>

      <section className="ops-section">
        <h3 className="ops-section-h">Database</h3>
        <table className="ops-table">
          <thead>
            <tr><th>Table</th><th className="num">Rows</th></tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.table}>
                <td className="mono">{t.table}</td>
                <td className="num">{t.rows.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="ops-table-total">
              <td>total live tuples</td>
              <td className="num">{total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <p className="ops-fineprint">
          Counts come from <code>pg_stat_user_tables.n_live_tup</code> — fast, approximate. Run <code>ANALYZE</code> to refresh.
        </p>
      </section>

      <section className="ops-section">
        <h3 className="ops-section-h">Orphan files</h3>
        <p className="ops-section-sub">
          Files under uploads that aren&rsquo;t referenced by any submission or feat. Read-only by design — deletion stays manual.
        </p>
        <OrphanScanPanel disabled={!isAdmin} />
      </section>

      <section className="ops-section">
        <h3 className="ops-section-h">Banned users</h3>
        {banned.length === 0 ? (
          <p className="ops-fineprint">None.</p>
        ) : (
          <ul className="ops-staff-list">
            {banned.map((b) => (
              <li key={b.id}>
                <span className="ops-tag banned">BANNED</span>
                <span className="ops-staff-handle">@{b.handle}</span>
                <span className="mono ops-staff-id">{b.discordId ?? "—"}</span>
                {b.bannedReason && <span className="ops-staff-reason">{b.bannedReason}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ops-section">
        <h3 className="ops-section-h">Ban / unban</h3>
        <BanForm disabled={!isAdmin} />
      </section>

      <p className="ops-fineprint" style={{ marginTop: "1.5rem" }}>
        Total live tuples · {total.toLocaleString()} · uploads · {humanBytes(uploads.bytes)}.
      </p>
    </>
  );
}
