export const metadata = { title: "Console" };

/**
 * Operator console. Placeholder until the auth-gated queue is wired —
 * the visual shell + sample transmissions match what the queue will look
 * like once `proxy.ts` lets mod/admin in and the DB query is hooked up.
 */
export default function ModPage() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
  const fileNo = String(((now.getUTCMonth() * 31 + now.getUTCDate()) * 7) % 1000).padStart(3, "0");

  return (
    <section className="section" style={{ paddingTop: "2rem" }}>
      <div className="container">
        <p className="eyebrow">Restricted</p>
        <h1 className="section-title">
          Operator <em>Console.</em>
        </h1>

        <div className="console" role="region" aria-label="Operator console">
          <div className="console-header">
            <span className="title">◆ DEGENFF // OPS CONSOLE</span>
            <span className="op">OPERATOR · — · NOT SIGNED IN</span>
            <span className="op">FILE NO·{fileNo}</span>
            <span className="clock">{clock}</span>
            <span className="live-led">LIVE</span>
          </div>

          {/* Left: vital signs */}
          <aside className="console-panel" aria-label="Vital signs">
            <h3>Vital Signs</h3>
            <div className="readout-grid">
              <div className="readout"><span className="v">177</span><span className="l">BPM</span></div>
              <div className="readout ok"><span className="v">00</span><span className="l">Queue</span></div>
              <div className="readout"><span className="v">00</span><span className="l">Backlog</span></div>
              <div className="readout warn"><span className="v">∞</span><span className="l">Patience</span></div>
              <div className="readout"><span className="v">01</span><span className="l">R630</span></div>
              <div className="readout ok"><span className="v">100%</span><span className="l">Uptime</span></div>
            </div>
            <div className="notice-strip">Auth wall coming online</div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-dim-aa)", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.5 }}>
              Once Discord OAuth seats a moderator role, this panel renders the live queue. Discord-side and site-side share an audit log.
            </p>
          </aside>

          {/* Center: incoming transmissions (placeholder) */}
          <div className="console-panel" aria-label="Incoming transmissions">
            <h3>Incoming Transmissions</h3>

            <article className="transmission">
              <span className="medium-glyph" aria-hidden>◈</span>
              <div>
                <div className="tx-header">
                  <span className="ts">{clock}</span>
                  <span className="from">@bonecouch</span>
                  <span className="tag">IMAGE</span>
                  <span className="tag">NSFW</span>
                </div>
                <h4 className="tx-title">Foot, but the foot looks haunted</h4>
                <p className="tx-snippet">Single JPG, 1280×960, sniff-pass: image/jpeg. Submitter notes: &ldquo;don&rsquo;t ask&rdquo;.</p>
                <div className="tx-actions">
                  <button className="toggle approve" type="button">Approve</button>
                  <button className="toggle feature" type="button">Feature</button>
                  <button className="toggle reject" type="button">Reject</button>
                </div>
              </div>
            </article>

            <article className="transmission">
              <span className="medium-glyph" aria-hidden>◐</span>
              <div>
                <div className="tx-header">
                  <span className="ts">-04m</span>
                  <span className="from">@steamroller</span>
                  <span className="tag">AUDIO</span>
                </div>
                <h4 className="tx-title">47:18 of lawnmower at idle</h4>
                <p className="tx-snippet">Single WAV, 48kHz mono. Title is accurate. Submitter says &ldquo;wear headphones.&rdquo;</p>
                <div className="tx-actions">
                  <button className="toggle approve" type="button">Approve</button>
                  <button className="toggle feature" type="button">Feature</button>
                  <button className="toggle reject" type="button">Reject</button>
                </div>
              </div>
            </article>

            <article className="transmission">
              <span className="medium-glyph" aria-hidden>⌬</span>
              <div>
                <div className="tx-header">
                  <span className="ts">-12m</span>
                  <span className="from">@dentist</span>
                  <span className="tag">CODE</span>
                </div>
                <h4 className="tx-title">A compiler that compiles itself, badly</h4>
                <p className="tx-snippet">Repo link + 800-word post-mortem. Self-hosts in 23 seconds, miscompiles in 8 places.</p>
                <div className="tx-actions">
                  <button className="toggle approve" type="button">Approve</button>
                  <button className="toggle feature" type="button">Feature</button>
                  <button className="toggle reject" type="button">Reject</button>
                </div>
              </div>
            </article>
          </div>

          {/* Right: activity log */}
          <aside className="console-panel console-log" aria-label="Activity log">
            <h3>Activity Log</h3>
            <div className="log-list">
              <div className="log-row approve"><span className="ts">-02m</span><span className="msg">@operator approved <b>foot, but haunted</b></span></div>
              <div className="log-row feature"><span className="ts">-08m</span><span className="msg">@operator featured <b>lawnmower at idle</b></span></div>
              <div className="log-row reject"><span className="ts">-14m</span><span className="msg">@nightporter rejected <b>generative slop</b> — reason: unedited LLM output</span></div>
              <div className="log-row approve"><span className="ts">-19m</span><span className="msg">@operator approved <b>compiler that compiles itself badly</b></span></div>
              <div className="log-row withdraw"><span className="ts">-31m</span><span className="msg">@bonecouch withdrew <b>the cursed video</b></span></div>
              <div className="log-row approve"><span className="ts">-44m</span><span className="msg">@operator approved <b>unsourced photograph of a dog</b></span></div>
              <div className="log-row reject"><span className="ts">-58m</span><span className="msg">@operator rejected <b>untitled.png</b> — reason: boring</span></div>
              <div className="log-row approve"><span className="ts">-1h</span><span className="msg">@nightporter approved <b>found pigeon</b></span></div>
              <div className="log-row feature"><span className="ts">-1h</span><span className="msg">@operator featured <b>unholy.gif</b></span></div>
              <div className="log-row approve"><span className="ts">-2h</span><span className="msg">@operator approved <b>field recording: 4am parking lot</b></span></div>
              <div className="log-row withdraw"><span className="ts">-3h</span><span className="msg">@mothlight withdrew <b>polaroid stack</b></span></div>
              <div className="log-row approve"><span className="ts">-3h</span><span className="msg">@nightporter approved <b>typewriter as percussion</b></span></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
