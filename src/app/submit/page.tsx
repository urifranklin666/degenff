import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SubmitForm from "./SubmitForm";

export const metadata = { title: "Submit" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=%2Fsubmit");
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "62ch" }}>
        <span className="eyebrow">Drop Zone</span>
        <h1 className="section-title">Submit A Work.</h1>
        <p className="lede" style={{ marginBottom: "1.5rem" }}>
          You&apos;re signed in as <b>@{session.user.handle}</b>. A human (and a Discord bot
          in a trench coat) sees it before it goes public. The bar is <em>did you make it</em>,
          not <em>is it good</em>.
        </p>

        <SubmitForm />

        <p className="lede" style={{ marginTop: "2rem", fontSize: "0.85rem", color: "var(--text-mid)" }}>
          By submitting, you affirm: (a) you made it or have rights to share it,
          (b) it&apos;s not bigotry / doxxing / CSAM / illegal in the jurisdiction it&apos;s hosted in,
          (c) you accept that a moderator decides whether the rest of the room sees it,
          (d) you don&apos;t expect a response within any particular timeframe.
        </p>
      </div>
    </section>
  );
}
