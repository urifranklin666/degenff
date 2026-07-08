import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireOps } from "@/lib/ops/auth";
import QueueClient, { type PendingSub, type PendingFeat } from "./QueueClient";

const { submissions, feats } = schema;

export const metadata = { title: "Ops · Queue" };

export default async function QueuePage() {
  await requireOps();

  const [subs, ft] = await Promise.all([
    db.query.submissions.findMany({
      where: eq(submissions.status, "pending"),
      with: { author: { columns: { handle: true, discordId: true } } },
      orderBy: [asc(submissions.createdAt)],
      limit: 200,
    }),
    db.query.feats.findMany({
      where: eq(feats.status, "pending"),
      with: { author: { columns: { handle: true } } },
      orderBy: [asc(feats.createdAt)],
      limit: 200,
    }),
  ]);

  const subRows: PendingSub[] = subs.map((s) => {
    const firstImage = (s.files ?? []).find((f) => f.mime.startsWith("image/"));
    return {
      id: s.id,
      title: s.title,
      medium: s.medium,
      nsfw: s.nsfw,
      authorHandle: s.author?.handle ?? "anon",
      createdAt: s.createdAt.toISOString(),
      tags: s.tags ?? [],
      hasFiles: (s.files?.length ?? 0) > 0,
      thumbPath: firstImage?.path ?? null,
      bodyExcerpt: (s.body ?? "").slice(0, 200),
    };
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
          Pending submissions + feats. Approve, feature, reject, or withdraw — solo or in bulk.
          Discord mirror is best-effort: failures don&rsquo;t roll back the DB.
        </p>
      </header>

      <QueueClient subs={subRows} feats={featRows} />
    </>
  );
}
