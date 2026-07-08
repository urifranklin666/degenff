import type { Metadata } from "next";
import { requireOps } from "@/lib/ops/auth";
import OpsSubnav from "./OpsSubnav";

export const metadata: Metadata = {
  title: "Ops Console",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOps();
  return (
    <section className="section" style={{ paddingTop: "1.5rem" }}>
      <div className="container">
        <p className="eyebrow">Restricted · {user.role.toUpperCase()}</p>
        <h1 className="section-title" style={{ marginBottom: "1rem" }}>
          Operator <em>Control.</em>
        </h1>
        <OpsSubnav />
        <div className="ops-body">{children}</div>
      </div>
    </section>
  );
}
