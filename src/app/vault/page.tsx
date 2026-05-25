import Link from "next/link";

export const metadata = {
  title: "Vault",
  robots: { index: false, follow: false },
};

/**
 * Hidden /vault. Not linked from anywhere — discoverable only by typing
 * the URL or inspecting the site. Evidence-locker styling, manifesto voice.
 */
export default function VaultPage() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getUTCFullYear()}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())}//${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}Z`;

  const items = [
    { id: "001", title: "the goose recording", redact: "internal use only" },
    { id: "002", title: "transcript: that one weekend", redact: "do not distribute" },
    { id: "003", title: "incident at the bulb marquee", redact: "filed under 'lighting'" },
    { id: "017", title: "polaroid stack — uncatalogued", redact: "wax-sealed" },
    { id: "023", title: "audio: 4am parking lot", redact: "headphones recommended" },
    { id: "041", title: "the cursed video", redact: "withdrawn by submitter" },
    { id: "088", title: "founder's notebook, page 12", redact: "spillage damage" },
    { id: "144", title: "evidence: dental coverage receipts", redact: "you opened this voluntarily" },
  ];

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "1100px" }}>
        <p className="eyebrow">restricted // evidence locker</p>
        <h1 className="section-title">
          The <em>Vault.</em>
        </h1>
        <p className="lede" style={{ marginBottom: "2rem" }}>
          You found the unlinked door. Past this point are the items management decided not to put
          on the wall. Inspect at your own pace. Photographs are forbidden but who&apos;s going to
          stop you. <span className="redact">no attorney is present</span>.
        </p>

        <div className="dossier-meta" style={{ marginBottom: "1.5rem" }}>
          <span>VAULT</span><b>SECTOR-7</b>
          <span className="sep">::</span>
          <span>OPENED</span><b>{ts}</b>
          <span className="sep">::</span>
          <span>VISITOR</span><b>UNVERIFIED</b>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {items.map((it) => (
            <div className="paper-card" key={it.id}>
              <span className="stamp-imprint">EXHIBIT {it.id}</span>
              <h4>{it.title}</h4>
              <div className="dossier-meta" style={{ marginBottom: "0.7rem" }}>
                <span>EXHIBIT</span><b>{it.id}</b><span className="sep">·</span><span>VAULT-7</span>
              </div>
              <p>
                Status: <span className="redact">{it.redact}</span>.
                Provenance unclear. <span className="redact">do not handle without gloves</span>.
                Filed by an operator who has since gone home.
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "3rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/" className="btn ghost no-underline">close the vault</Link>
          <Link href="/submissions" className="btn ghost no-underline">to the public floor</Link>
        </div>

        <p style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-dim-aa)", letterSpacing: "0.16em", textTransform: "uppercase", marginTop: "2.5rem", textAlign: "center" }}>
          ◆ you were not here. nothing happened. the door was never opened. ◆
        </p>
      </div>
    </section>
  );
}
