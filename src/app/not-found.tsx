import Link from "next/link";

export const metadata = { title: "Not Found" };

export default function NotFound() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getUTCFullYear()}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())}//${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}Z`;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "880px" }}>
        <p className="eyebrow">404 // missing person</p>
        <div className="slam-stack" style={{ marginBottom: "2rem" }}>
          <span className="line slam">SUBJECT</span>
          <span className="line menace"><em>not found in the database</em></span>
          <span className="line slam"><span className="skew">PROBABLY GONE</span></span>
          <span className="line blip" style={{ marginTop: "0.7rem" }}>
            ▮ route does not exist ▮ subject never enrolled ▮ try the front door ▮
          </span>
        </div>

        <div className="paper-card" style={{ maxWidth: "640px" }}>
          <span className="stamp-imprint">REDACTED</span>
          <h4>Last Known Information</h4>
          <div className="dossier-meta" style={{ marginBottom: "0.9rem" }}>
            <span>FILE</span><b>NO·404</b><span className="sep">::</span><span>TS</span><b>{ts}</b>
          </div>
          <p>
            REPORTED MISSING from the URL you typed. Last seen in a hallway with no exits marked.
            No forwarding address. <span className="redact">subject refuses counsel</span> and has not
            been heard from since. If you have information, see <a href="https://deadplug.digital">deadplug.digital</a>{" "}
            or proceed to the public-facing rooms.
          </p>
          <p style={{ marginTop: "0.6rem" }}>
            CIRCUMSTANCES: <span className="redact">the door was locked from the inside</span> and the
            light was off. No struggle. <span className="redact">consent implied</span>.
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "2rem" }}>
          <Link href="/" className="btn no-underline">return to lobby</Link>
          <Link href="/submissions" className="btn ghost no-underline">browse submissions</Link>
          <Link href="/about" className="btn ghost no-underline">read the manifesto</Link>
        </div>
      </div>
    </section>
  );
}
