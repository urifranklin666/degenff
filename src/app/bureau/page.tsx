import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { FILING_STATUS_LABEL } from "@/lib/bureau-shared";
import BureauClient from "./BureauClient";

const { bureauFilings } = schema;

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Bureau",
  description: "File a form. Be processed. The clerk rules in the order filings are lost.",
};

function fmt(d: Date | null): string {
  return d ? d.toISOString().replace("T", " ").slice(0, 16) + "Z" : "—";
}

export default async function BureauPage() {
  const session = await auth();
  const signedIn = !!session?.user?.id;

  const myFilings = signedIn
    ? await db.query.bureauFilings.findMany({
        where: eq(bureauFilings.userId, session!.user!.id!),
        orderBy: [desc(bureauFilings.createdAt)],
        limit: 30,
      })
    : [];

  const hasOpenFiling = myFilings.some(
    (f) => f.status === "received" || f.status === "under_review",
  );

  return (
    <section className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container" style={{ maxWidth: "980px" }}>
        <p className="eyebrow">{"// municipal services · window 3 of 1"}</p>
        <h1 className="section-title">
          The <em>Bureau.</em>
        </h1>
        <p className="lede" style={{ marginBottom: "1rem", color: "var(--text)" }}>
          The house runs on paperwork now. Select a form, state your plea, and wait —
          the clerk processes filings in the order they are lost. Approvals mint a
          permit stamp onto your <Link href="/me">record</Link>. Denials are free.
        </p>
        <p className="bureau-notice">
          NOTICE: THE CLERK IS IN. PROCESSING TIMES VARY WITH MOOD. NO EXPEDITING. NO REFUNDS. NO TALKING AT THE WINDOW.
        </p>

        {!signedIn && (
          <p className="midway-signin">
            <Link href="/gate?next=/bureau" className="btn no-underline">
              Sign in to file
            </Link>
            <span>— anonymous filings go directly into the shredder, which is broken.</span>
          </p>
        )}

        <BureauClient signedIn={signedIn} pollForRulings={hasOpenFiling} />

        {myFilings.length > 0 && (
          <div className="bureau-docket">
            <h2 className="contrib-h">{"// your docket"}</h2>
            <ul className="bureau-docket-list">
              {myFilings.map((f) => (
                <li key={f.id} className={`bureau-filing is-${f.status}`}>
                  <div className="bureau-filing-head">
                    <span className="bureau-filing-code">FORM {f.formCode}</span>
                    <span className={`bureau-filing-status is-${f.status}`}>
                      {FILING_STATUS_LABEL[f.status] ?? f.status}
                    </span>
                    <span className="bureau-filing-date">filed {fmt(f.createdAt)}</span>
                  </div>
                  <p className="bureau-filing-body">&ldquo;{f.body}&rdquo;</p>
                  {f.clerkNote && (
                    <p className="bureau-filing-note">
                      <span className="bureau-filing-note-label">clerk:</span> {f.clerkNote}
                      {f.stampLabel && <span className="bureau-filing-stamp">◆ {f.stampLabel}</span>}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
