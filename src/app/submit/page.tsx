export const metadata = { title: "Submit" };

export default function SubmitPage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "62ch" }}>
        <p className="eyebrow">Drop Zone</p>
        <h1 className="section-title">Submit A Work.</h1>
        <p className="lede" style={{ marginBottom: "2rem" }}>
          The form lights up once Discord login is wired. Submissions are tied to your Discord identity
          so the mods know who to talk to. Anonymous-mode is on the roadmap.
        </p>

        <div className="tile" style={{ minHeight: 0 }}>
          <span className="tile-glyph">◈</span>
          <h3 className="tile-title">Coming online momentarily.</h3>
          <p className="tile-body">
            Once Discord OAuth and the upload pipeline are wired, this page renders:
            medium picker (image/audio/video/text/code/link), file drop or paste box,
            title, body, tags, NSFW toggle, and a submit button that drops your work into the mod queue.
          </p>
        </div>
      </div>
    </section>
  );
}
