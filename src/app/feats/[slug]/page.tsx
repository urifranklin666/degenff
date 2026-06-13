import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, desc, asc, eq, gt, lt } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { isValidSlug } from "@/lib/markdown";
import PrizeStamp from "@/components/PrizeStamp";

const { feats, users } = schema;

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata(props: PageProps) {
  const { slug } = await props.params;
  if (!isValidSlug(slug)) return { title: "Not found" };
  const feat = await db.query.feats.findFirst({ where: eq(feats.slug, slug) });
  return {
    title: feat?.title ?? "Not found",
    description: feat?.summary ?? undefined,
  };
}

const STATUS_STAMP = {
  approved: { tone: "gold", label: "On Record" },
  pending: { tone: "evidence", label: "Awaiting Review" },
  rejected: { tone: "banned", label: "Rejected" },
  withdrawn: { tone: "evidence", label: "Withdrawn" },
} as const;

export default async function FeatPage(props: PageProps) {
  const { slug } = await props.params;
  if (!isValidSlug(slug)) notFound();

  const session = await auth();
  const feat = await db.query.feats.findFirst({ where: eq(feats.slug, slug) });
  if (!feat) notFound();

  const author = feat.userId
    ? await db.query.users.findFirst({ where: eq(users.id, feat.userId) })
    : null;

  const viewerIsOwner = session?.user?.id === feat.userId;
  const viewerIsMod = session?.user?.role === "mod" || session?.user?.role === "admin";

  if (feat.status !== "approved" && !viewerIsOwner && !viewerIsMod) {
    redirect("/feats");
  }

  // adjacent published feats, museum-walk order (newest first)
  const [newer, older] =
    feat.status === "approved" && feat.publishedAt
      ? await Promise.all([
          db.query.feats.findFirst({
            columns: { slug: true, title: true },
            where: and(eq(feats.status, "approved"), gt(feats.publishedAt, feat.publishedAt)),
            orderBy: [asc(feats.publishedAt)],
          }),
          db.query.feats.findFirst({
            columns: { slug: true, title: true },
            where: and(eq(feats.status, "approved"), lt(feats.publishedAt, feat.publishedAt)),
            orderBy: [desc(feats.publishedAt)],
          }),
        ])
      : [null, null];

  const stamp = STATUS_STAMP[feat.status] ?? STATUS_STAMP.pending;
  const filed = feat.publishedAt
    ? new Date(feat.publishedAt).toISOString().slice(0, 10)
    : new Date(feat.createdAt).toISOString().slice(0, 10);

  return (
    <section className="section feat-detail">
      <div className="container" style={{ maxWidth: "78ch" }}>
        <div className="feat-file-head">
          <span className="dossier-meta">
            <b>FILE ⬢ {feat.slug.slice(0, 32).toUpperCase()}</b>
            <span className="sep">·</span> filed {filed}
            <span className="sep">·</span> {feat.status}
          </span>
          <PrizeStamp tone={stamp.tone} rotate="r-n4">
            {stamp.label}
          </PrizeStamp>
        </div>

        <h1 className="section-title">{feat.title}</h1>
        {feat.summary && (
          <p
            className="lede"
            style={{ marginBottom: "1.5rem", fontFamily: "var(--menace)", fontStyle: "italic" }}
          >
            {feat.summary}
          </p>
        )}

        <dl className="feat-plate">
          <div className="row">
            <dt>operator</dt>
            <dd>
              {author?.handle ? (
                <Link href={`/u/${author.handle}`} className="no-underline">
                  @{author.handle}
                </Link>
              ) : (
                "anon"
              )}
            </dd>
          </div>
          <div className="row">
            <dt>filed</dt>
            <dd>{filed}</dd>
          </div>
          {feat.repoUrl && (
            <div className="row">
              <dt>repo</dt>
              <dd>
                <a href={feat.repoUrl} rel="noopener nofollow" target="_blank">
                  {feat.repoUrl.replace(/^https?:\/\//, "")} ↗
                </a>
              </dd>
            </div>
          )}
          {feat.demoUrl && (
            <div className="row">
              <dt>demo</dt>
              <dd>
                <a href={feat.demoUrl} rel="noopener nofollow" target="_blank">
                  {feat.demoUrl.replace(/^https?:\/\//, "")} ↗
                </a>
              </dd>
            </div>
          )}
          {feat.tags && feat.tags.length > 0 && (
            <div className="row">
              <dt>tags</dt>
              <dd className="feat-plate-tags">
                {feat.tags.map((t) => (
                  <Link key={t} href={`/tag/${encodeURIComponent(t)}`} className="no-underline">
                    #{t}
                  </Link>
                ))}
              </dd>
            </div>
          )}
        </dl>

        {feat.heroImagePath && (
          <figure className="evidence-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/uploads/${feat.heroImagePath}`}
              alt=""
              className="feat-hero"
              loading="lazy"
            />
            <figcaption>fig. 01 — the specimen, as recovered</figcaption>
          </figure>
        )}

        {/*
          body_html was sanitized server-side in renderMarkdown() before being
          stored. Safe to render via dangerouslySetInnerHTML.
        */}
        <div className="feat-body" dangerouslySetInnerHTML={{ __html: feat.bodyHtml }} />

        <div className="feat-file-end" aria-hidden>
          ⬢ — file ends here — ⬢
        </div>

        <nav className="feat-walk" aria-label="Adjacent feats">
          {newer ? (
            <Link href={`/feats/${newer.slug}`} className="feat-walk-link no-underline">
              <span className="d">← newer exhibit</span>
              <span className="t">{newer.title}</span>
            </Link>
          ) : (
            <span />
          )}
          <Link href="/feats" className="feat-walk-all no-underline">
            the display case
          </Link>
          {older ? (
            <Link href={`/feats/${older.slug}`} className="feat-walk-link is-right no-underline">
              <span className="d">older exhibit →</span>
              <span className="t">{older.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </section>
  );
}
