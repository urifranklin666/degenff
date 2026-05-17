export const metadata = { title: "Discord" };

export default function DiscordPage() {
  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">The Community Spine</p>
        <h1 className="section-title">Enter The Discord.</h1>
        <p className="lede" style={{ marginBottom: "2rem" }}>
          The site logs in through Discord. Submissions get mirrored to a mod-queue channel.
          Approvals get mirrored to a showcase channel. Roles in the server map to roles on the site.
          Discussion happens there. Pictures happen there. The vibe is multimedia explosion.
        </p>

        <div className="tile" style={{ minHeight: 0 }}>
          <span className="tile-glyph">⬢</span>
          <h3 className="tile-title">Server invite coming online.</h3>
          <p className="tile-body">
            Once the bot is wired to the guild this page renders the live widget — channel list,
            online count, last public message excerpts — and the invite link goes here.
          </p>
        </div>
      </div>
    </section>
  );
}
