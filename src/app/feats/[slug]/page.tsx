import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { isValidSlug } from "@/lib/markdown";

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

  return (
    <section className="section feat-detail">
      <div className="container" style={{ maxWidth: "78ch" }}>
        <p className="eyebrow">
          {feat.status === "pending"
            ? "Pending review"
            : feat.status === "rejected"
              ? "Rejected"
              : "Published"}
        </p>
        <h1 className="section-title">{feat.title}</h1>
        {feat.summary && (
          <p className="lede" style={{ marginBottom: "1.5rem", fontFamily: "var(--menace)", fontStyle: "italic" }}>
            {feat.summary}
          </p>
        )}
        <p className="lede" style={{ marginBottom: "1.5rem", fontFamily: "var(--mono)", fontSize: "0.85rem", color: "var(--text-mid)" }}>
          by <b>@{author?.handle ?? "anon"}</b>
          {feat.publishedAt ? ` · ${new Date(feat.publishedAt).toISOString().slice(0, 10)}` : ""}
          {feat.repoUrl && <> · <a href={feat.repoUrl}>repo</a></>}
          {feat.demoUrl && <> · <a href={feat.demoUrl}>demo</a></>}
        </p>

        {feat.heroImagePath && (
          <img
            src={`/uploads/${feat.heroImagePath}`}
            alt=""
            className="feat-hero"
            loading="lazy"
          />
        )}

        {/*
          body_html was sanitized server-side in renderMarkdown() before being
          stored. Safe to render via dangerouslySetInnerHTML.
        */}
        <div
          className="feat-body"
          dangerouslySetInnerHTML={{ __html: feat.bodyHtml }}
        />

        {feat.tags && feat.tags.length > 0 && (
          <div className="tile-tags" style={{ marginTop: "2rem" }}>
            {feat.tags.map((t) => <span key={t}>{t}</span>)}
          </div>
        )}

        <hr />
        <p>
          <Link href="/feats">← back to feats</Link>
        </p>
      </div>
    </section>
  );
}
