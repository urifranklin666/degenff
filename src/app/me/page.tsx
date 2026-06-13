import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";

const { submissions, feats } = schema;

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your Record",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  pending:   "in the queue",
  approved:  "approved",
  rejected:  "rejected",
  withdrawn: "withdrawn",
};

function dateOnly(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

export default async function MePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=/me");
  const user = session.user;

  const [mySubs, myFeats] = await Promise.all([
    db.query.submissions.findMany({
      where: eq(submissions.userId, user.id),
      orderBy: [desc(submissions.createdAt)],
      limit: 200,
    }),
    db.query.feats.findMany({
      where: eq(feats.userId, user.id),
      orderBy: [desc(feats.createdAt)],
      limit: 200,
    }),
  ]);

  const byStatus = {
    pending:   mySubs.filter((s) => s.status === "pending"),
    approved:  mySubs.filter((s) => s.status === "approved"),
    rejected:  mySubs.filter((s) => s.status === "rejected"),
    withdrawn: mySubs.filter((s) => s.status === "withdrawn"),
  };
  const featByStatus = {
    pending:   myFeats.filter((f) => f.status === "pending"),
    approved:  myFeats.filter((f) => f.status === "approved"),
    rejected:  myFeats.filter((f) => f.status === "rejected"),
    withdrawn: myFeats.filter((f) => f.status === "withdrawn"),
  };

  return (
    <section className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container">
        <p className="eyebrow">{`// your file · @${user.handle}`}</p>
        <h1 className="section-title">
          Your <em>Record.</em>
        </h1>
        <p className="lede" style={{ marginBottom: "1.25rem", color: "var(--text)" }}>
          Everything you&apos;ve submitted, in every state it ended up in. Mods leave reasons on rejects.
          Public profile is at <Link href={`/u/${user.handle}`}>/u/{user.handle}</Link>.
        </p>
        <p style={{ marginBottom: "2rem" }}>
          <span className="dossier-meta">
            <b>SUBJECT № {user.id.slice(0, 8).toUpperCase()}</b>
            <span className="sep">·</span> file open
            <span className="sep">·</span> {mySubs.length + myFeats.length} entries
          </span>
        </p>

        <div className="me-grid">
          <div className="me-stat"><span className="v">{byStatus.pending.length + featByStatus.pending.length}</span><span className="l">pending</span></div>
          <div className="me-stat ok"><span className="v">{byStatus.approved.length + featByStatus.approved.length}</span><span className="l">approved</span></div>
          <div className="me-stat feat"><span className="v">{byStatus.approved.filter((s) => s.featured).length}</span><span className="l">featured</span></div>
          <div className="me-stat bad"><span className="v">{byStatus.rejected.length + featByStatus.rejected.length}</span><span className="l">rejected</span></div>
          <div className="me-stat"><span className="v">{byStatus.withdrawn.length + featByStatus.withdrawn.length}</span><span className="l">withdrawn</span></div>
        </div>

        {byStatus.pending.length > 0 && (
          <Section title="In the queue">
            {byStatus.pending.map((s) => (
              <MeRow
                key={s.id}
                title={s.title}
                href={`/submissions/${s.id}`}
                meta={`${s.medium} · submitted ${dateOnly(s.createdAt)}`}
                status="pending"
              />
            ))}
            {featByStatus.pending.map((f) => (
              <MeRow
                key={f.id}
                title={`⬢ ${f.title}`}
                href={`/feats/${f.slug}`}
                meta={`feat · submitted ${dateOnly(f.createdAt)}`}
                status="pending"
              />
            ))}
          </Section>
        )}

        {byStatus.rejected.length + featByStatus.rejected.length > 0 && (
          <Section title="Rejected — with reasons">
            {byStatus.rejected.map((s) => (
              <MeRow
                key={s.id}
                title={s.title}
                href={`/submissions/${s.id}`}
                meta={`${s.medium} · decided ${dateOnly(s.decidedAt)}`}
                status="rejected"
                reason={s.rejectionReason}
                resubmit="/submit"
              />
            ))}
            {featByStatus.rejected.map((f) => (
              <MeRow
                key={f.id}
                title={`⬢ ${f.title}`}
                href={`/feats/${f.slug}`}
                meta={`feat · decided ${dateOnly(f.createdAt)}`}
                status="rejected"
                resubmit="/feats/new"
              />
            ))}
          </Section>
        )}

        {byStatus.approved.length + featByStatus.approved.length > 0 && (
          <Section title="In the room">
            {byStatus.approved.map((s) => (
              <MeRow
                key={s.id}
                title={s.title}
                href={`/submissions/${s.id}`}
                meta={`${s.medium} · approved ${dateOnly(s.decidedAt)}${s.featured ? " · FEATURED" : ""}`}
                status={s.featured ? "feature" : "approved"}
                thumbPath={(s.files ?? []).find((f) => f.mime.startsWith("image/"))?.path ?? null}
              />
            ))}
            {featByStatus.approved.map((f) => (
              <MeRow
                key={f.id}
                title={`⬢ ${f.title}`}
                href={`/feats/${f.slug}`}
                meta={`feat · published ${dateOnly(f.publishedAt)}`}
                status="approved"
              />
            ))}
          </Section>
        )}

        {byStatus.withdrawn.length + featByStatus.withdrawn.length > 0 && (
          <Section title="Withdrawn">
            {byStatus.withdrawn.map((s) => (
              <MeRow
                key={s.id}
                title={s.title}
                href={`/submissions/${s.id}`}
                meta={`${s.medium} · withdrawn`}
                status="withdrawn"
              />
            ))}
          </Section>
        )}

        {mySubs.length === 0 && myFeats.length === 0 && (
          <div className="me-empty">
            <p>Nothing on file. The door is over there.</p>
            <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link href="/submit" className="btn no-underline">Submit a work</Link>
              <Link href="/feats/new" className="btn ghost no-underline">Write a feat</Link>
            </div>
          </div>
        )}

        <p className="ops-fineprint" style={{ marginTop: "2rem" }}>
          {STATUS_LABEL.pending} · {STATUS_LABEL.approved} · {STATUS_LABEL.rejected} · {STATUS_LABEL.withdrawn}
        </p>
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

function MeRow({
  title,
  href,
  meta,
  status,
  reason,
  resubmit,
  thumbPath,
}: {
  title: string;
  href: string;
  meta: string;
  status: "pending" | "approved" | "rejected" | "withdrawn" | "feature";
  reason?: string | null;
  resubmit?: string;
  thumbPath?: string | null;
}) {
  return (
    <li className={`me-row me-row-${status}`}>
      {thumbPath ? (
        <Image src={`/uploads/${thumbPath}`} alt="" width={56} height={56} className="me-thumb" unoptimized />
      ) : (
        <div className="me-thumb me-thumb-empty" aria-hidden>·</div>
      )}
      <div className="me-row-body">
        <Link href={href} className="me-row-title">{title}</Link>
        <div className="me-row-meta">{meta}</div>
        {reason && <div className="me-row-reason">reason: <em>{reason}</em></div>}
      </div>
      <div className="me-row-side">
        <span className={`me-status me-status-${status}`}>{status}</span>
        {resubmit && (
          <Link href={resubmit} className="me-resubmit">try again →</Link>
        )}
      </div>
    </li>
  );
}
