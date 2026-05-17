export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "72ch" }}>
        <p className="eyebrow">Manifesto</p>
        <h1 className="section-title">The Whole Thing,<br />Plainly Stated.</h1>

        <div className="lede" style={{ display: "grid", gap: "1.25rem" }}>
          <p>
            <b>What this is.</b> A small, hand-built website that holds three things at once:
            artist submissions in any medium, long-form coding feats, and a Discord-integrated community
            that bleeds into every page of the site.
          </p>
          <p>
            <b>Who runs it.</b> The same people who run{" "}
            <a href="https://deadplug.digital">deadplug.digital</a>. One Dell R630. One residential connection.
            Cloudflare Tunnel out front, Caddy in the middle, Next.js + Postgres on disk.
            No SaaS subscriptions. No analytics product. The thing you&apos;re looking at exists on a server we own.
          </p>
          <p>
            <b>What we publish.</b> Anything you made, in any medium, that you&apos;d be willing to stand
            behind in front of strangers. Image, audio, video, text, code, link. Submissions are
            moderated by humans before they go public.
          </p>
          <p>
            <b>What we don&apos;t.</b> Bigotry, doxxing, illegal content, generative slop you didn&apos;t edit,
            CSAM, anything that wastes a moderator&apos;s time. Boring is also a moderation reason.
          </p>
          <p>
            <b>What you get out of it.</b> A small, attentive audience and a place to put work that
            doesn&apos;t need to perform for an algorithm. We&apos;ll talk about it in the Discord.
          </p>
          <p style={{ color: "var(--text-bright)" }}>
            <b>Posture.</b> Operator-cult industrial. Oxblood on black. Monospace numerals.
            If your thing makes someone slightly uncomfortable in a specific way, you&apos;re in the right room.
          </p>
        </div>
      </div>
    </section>
  );
}
