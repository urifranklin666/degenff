export const metadata = { title: "Mod" };

export default function ModPage() {
  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Restricted</p>
        <h1 className="section-title">Mod Queue.</h1>
        <p className="lede">
          Pending submissions land here for human review. Approve / reject / edit / feature.
          Discord-side has the same buttons; the audit log is shared.
        </p>
        <div className="tile" style={{ minHeight: 0, marginTop: "2rem" }}>
          <span className="tile-glyph">◆</span>
          <h3 className="tile-title">Auth wall coming online.</h3>
          <p className="tile-body">
            Once Discord OAuth is wired and the &lsquo;Mod&rsquo; role is set on the guild, this page
            requires a signed-in mod and shows the pending queue.
          </p>
        </div>
      </div>
    </section>
  );
}
