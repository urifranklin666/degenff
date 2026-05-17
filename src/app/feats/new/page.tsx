import { redirect } from "next/navigation";
import { auth } from "@/auth";
import NewFeatForm from "./NewFeatForm";

export const metadata = { title: "New Feat" };
export const dynamic = "force-dynamic";

export default async function NewFeatPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=%2Ffeats%2Fnew");
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "70ch" }}>
        <span className="eyebrow">Long-Form</span>
        <h1 className="section-title">Submit A <em>Feat.</em></h1>
        <p className="lede" style={{ marginBottom: "1.5rem" }}>
          You&apos;re signed in as <b>@{session.user.handle}</b>. This is the case-study
          format — for projects that finished. Tell the whole story. Repo link, demo,
          screenshots, post-mortem. Make the reader feel slightly worse about their
          own week.
        </p>

        <NewFeatForm />

        <p className="lede" style={{ marginTop: "2rem", fontSize: "0.85rem", color: "var(--text-mid)" }}>
          By submitting: (a) you made it or have rights to share it, (b) the body is
          your writing, (c) a moderator decides when it goes live, (d) we render
          your markdown server-side through a strict allowlist — script tags,
          iframes, and inline styles are stripped.
        </p>
      </div>
    </section>
  );
}
