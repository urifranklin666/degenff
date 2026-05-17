import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";

const { submissions, users } = schema;

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function SubmissionPage(props: PageProps) {
  const { id } = await props.params;
  const session = await auth();

  const submission = await db.query.submissions.findFirst({
    where: eq(submissions.id, id),
  });
  if (!submission) notFound();

  const author = submission.userId
    ? await db.query.users.findFirst({ where: eq(users.id, submission.userId) })
    : null;

  const viewerIsOwner = session?.user?.id === submission.userId;
  const viewerIsMod = session?.user?.role === "mod" || session?.user?.role === "admin";

  // Hide pending/rejected from random visitors. Owners and mods can see.
  if (submission.status !== "approved" && !viewerIsOwner && !viewerIsMod) {
    redirect("/submissions");
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "78ch" }}>
        <p className="eyebrow">
          {submission.status === "pending"
            ? "Pending review"
            : submission.status === "rejected"
              ? "Rejected"
              : submission.featured ? "Featured" : "Approved"}
        </p>
        <h1 className="section-title">{submission.title}</h1>
        <p className="lede" style={{ marginBottom: "1.5rem", fontFamily: "var(--mono)", fontSize: "0.85rem" }}>
          by <b>@{author?.handle ?? "anon"}</b> · {submission.medium}
          {submission.nsfw ? " · NSFW" : ""}
          {" · "}
          {new Date(submission.createdAt).toISOString().slice(0, 10)}
        </p>

        {submission.files?.length > 0 && (
          <div className="submission-files">
            {submission.files.map((f, i) => {
              if (f.mime.startsWith("image/"))
                return <img key={i} src={`/uploads/${f.path}`} alt="" loading="lazy" />;
              if (f.mime.startsWith("audio/"))
                return <audio key={i} controls src={`/uploads/${f.path}`} />;
              if (f.mime.startsWith("video/"))
                return <video key={i} controls src={`/uploads/${f.path}`} />;
              return null;
            })}
          </div>
        )}

        {submission.linkUrl && (
          <p className="lede"><a href={submission.linkUrl} target="_blank" rel="noopener noreferrer">{submission.linkUrl}</a></p>
        )}

        {submission.body && (
          <div className="lede" style={{ marginTop: "1.5rem", whiteSpace: "pre-wrap" }}>
            {submission.body}
          </div>
        )}

        {submission.tags && submission.tags.length > 0 && (
          <div className="tile-tags" style={{ marginTop: "2rem" }}>
            {submission.tags.map((t) => <span key={t}>{t}</span>)}
          </div>
        )}

        <hr />
        <p>
          <Link href="/submissions">← back to gallery</Link>
        </p>
      </div>
    </section>
  );
}
