import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireOps } from "@/lib/ops/auth";
import QueueClient, { type PendingFeat } from "./QueueClient";

const { feats } = schema;

export const metadata = { title: "Ops · Queue" };

export default async function QueuePage() {
  await requireOps();

  const ft = await db.query.feats.findMany({
    where: eq(feats.status, "pending"),
    with: { author: { columns: { handle: true } } },
    orderBy: [asc(feats.createdAt)],
    limit: 200,
  });

  const featRows: PendingFeat[] = ft.map((f) => ({
    id: f.id,
    slug: f.slug,
    title: f.title,
    summary: f.summary ?? "",
    authorHandle: f.author?.handle ?? "anon",
    createdAt: f.createdAt.toISOString(),
    repoUrl: f.repoUrl,
    demoUrl: f.demoUrl,
  }));

  return (
    <>
      <header className="ops-panel-head">
        <h2>Queue</h2>
        <p className="ops-panel-sub">
          Pending feats. Approve, feature, reject, or withdraw — solo or in bulk.
          Discord mirror is best-effort: failures don&rsquo;t roll back the DB.
        </p>
      </header>

      <QueueClient feats={featRows} />
    </>
  );
}
