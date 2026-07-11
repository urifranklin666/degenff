import { redirect } from "next/navigation";
import { auth } from "@/lib/session";
import GateClient from "./GateClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Gate",
  description: "Sign the register or present your key. The house checks everyone.",
  robots: { index: false, follow: false },
};

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; bridge?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  // Only ever bounce within the site — no open redirects through the gate.
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  if (session?.user) redirect(next);

  return (
    <section className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container" style={{ maxWidth: "760px" }}>
        <p className="eyebrow">{"// admissions · no wristbands"}</p>
        <h1 className="section-title">
          The <em>Gate.</em>
        </h1>
        <p className="lede" style={{ marginBottom: "2rem", color: "var(--text)" }}>
          No passwords. The house holds nothing it can leak — your device keeps the key,
          the register keeps your name. Present a key if you have one; sign the register
          if you don&apos;t.
        </p>

        <GateClient next={next} bridgeError={params.bridge === "unknown"} />

        <p className="gate-bridge">
          Old Discord hands: your account survived the funeral.{" "}
          <a href={`/api/bridge/discord?next=${encodeURIComponent(next)}`}>
            Claim it through the bridge
          </a>{" "}
          — one last Discord sign-in, then add a key and never look back.
        </p>
      </div>
    </section>
  );
}
