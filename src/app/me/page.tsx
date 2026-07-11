import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { awardsForUser } from "@/lib/awards";
import MeAuthPanel, { type PasskeyRow } from "./MeAuthPanel";

const { feats, passkeys } = schema;

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your Record",
  robots: { index: false, follow: false },
};

function dateOnly(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

const SOURCE_LABEL: Record<string, string> = {
  "midway-wheel": "the wheel",
  "midway-scratch": "a scratch card",
  "midway-tooth": "the tooth jar",
  barker: "the barker, personally",
  seance: "the other side",
  bureau: "the bureau",
};

export default async function MePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/gate?next=/me");
  const user = session.user;

  const [myFeats, myAwards, myKeys] = await Promise.all([
    db.query.feats.findMany({
      where: eq(feats.userId, user.id),
      orderBy: [desc(feats.createdAt)],
      limit: 200,
    }),
    awardsForUser(user.id, 200),
    db.query.passkeys.findMany({
      where: eq(passkeys.userId, user.id),
      orderBy: [desc(passkeys.createdAt)],
    }),
  ]);

  const keyRows: PasskeyRow[] = myKeys.map((k) => ({
    id: k.id,
    label: k.label,
    deviceType: k.deviceType,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
  }));

  const featByStatus = {
    pending: myFeats.filter((f) => f.status === "pending"),
    approved: myFeats.filter((f) => f.status === "approved"),
    rejected: myFeats.filter((f) => f.status === "rejected"),
    withdrawn: myFeats.filter((f) => f.status === "withdrawn"),
  };
  const titles = myAwards.filter((a) => a.kind === "title");
  const stamps = myAwards.filter((a) => a.kind === "stamp");

  return (
    <section className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container">
        <p className="eyebrow">{`// your file · @${user.handle}`}</p>
        <h1 className="section-title">
          Your <em>Record.</em>
        </h1>
        <p className="lede" style={{ marginBottom: "1.25rem", color: "var(--text)" }}>
          Everything the house has on you: feats filed, prizes won, permits stamped.
          Public profile is at <Link href={`/u/${user.handle}`}>/u/{user.handle}</Link>.
        </p>
        <p style={{ marginBottom: "2rem" }}>
          <span className="dossier-meta">
            <b>SUBJECT № {user.id.slice(0, 8).toUpperCase()}</b>
            <span className="sep">·</span> file open
            <span className="sep">·</span> {myFeats.length + myAwards.length} entries
          </span>
        </p>

        <div className="me-grid">
          <div className="me-stat"><span className="v">{featByStatus.pending.length}</span><span className="l">feats pending</span></div>
          <div className="me-stat ok"><span className="v">{featByStatus.approved.length}</span><span className="l">feats live</span></div>
          <div className="me-stat feat"><span className="v">{titles.length}</span><span className="l">titles held</span></div>
          <div className="me-stat"><span className="v">{stamps.length}</span><span className="l">stamps</span></div>
        </div>

        {titles.length > 0 && (
          <Section title="titles held">
            {titles.map((a) => (
              <li key={a.id} className="me-row me-row-feature">
                <div className="me-thumb me-thumb-empty" aria-hidden>◈</div>
                <div className="me-row-body">
                  <span className="me-row-title">{a.label}</span>
                  <div className="me-row-meta">
                    conferred by {SOURCE_LABEL[a.source] ?? a.source} · {a.createdAt.slice(0, 10)}
                  </div>
                  {a.flavor && <div className="me-row-reason"><em>{a.flavor}</em></div>}
                </div>
                <div className="me-row-side">
                  <span className="me-status me-status-feature">title</span>
                </div>
              </li>
            ))}
          </Section>
        )}

        {stamps.length > 0 && (
          <Section title="stamps on file">
            {stamps.map((a) => (
              <li key={a.id} className="me-row me-row-approved">
                <div className="me-thumb me-thumb-empty" aria-hidden>◆</div>
                <div className="me-row-body">
                  <span className="me-row-title">{a.label}</span>
                  <div className="me-row-meta">
                    issued by {SOURCE_LABEL[a.source] ?? a.source} · {a.createdAt.slice(0, 10)}
                  </div>
                  {a.flavor && <div className="me-row-reason"><em>{a.flavor}</em></div>}
                </div>
                <div className="me-row-side">
                  <span className="me-status me-status-approved">stamp</span>
                </div>
              </li>
            ))}
          </Section>
        )}

        {myFeats.length > 0 && (
          <Section title="feats">
            {myFeats.map((f) => (
              <li key={f.id} className={`me-row me-row-${f.status}`}>
                <div className="me-thumb me-thumb-empty" aria-hidden>⬢</div>
                <div className="me-row-body">
                  <Link href={`/feats/${f.slug}`} className="me-row-title">{f.title}</Link>
                  <div className="me-row-meta">
                    feat · {f.status === "approved" ? `published ${dateOnly(f.publishedAt)}` : `submitted ${dateOnly(f.createdAt)}`}
                  </div>
                </div>
                <div className="me-row-side">
                  <span className={`me-status me-status-${f.status}`}>{f.status}</span>
                  {f.status === "rejected" && (
                    <Link href="/feats/new" className="me-resubmit">try again →</Link>
                  )}
                </div>
              </li>
            ))}
          </Section>
        )}

        <MeAuthPanel keys={keyRows} />

        {myFeats.length === 0 && myAwards.length === 0 && (
          <div className="me-empty">
            <p>Nothing on file. The midway is over there.</p>
            <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link href="/midway" className="btn no-underline">Play the Midway</Link>
              <Link href="/feats/new" className="btn ghost no-underline">Write a feat</Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="me-section">
      <h2 className="me-h">{`// ${title}`}</h2>
      <ul className="me-list">{children}</ul>
    </div>
  );
}
