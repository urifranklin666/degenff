export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer" aria-label="Site footer">
      <div className="container footer-inner">
        <div>
          <b>degeneratefuckface.com</b> — a deadplug.digital adjacent property.
          <br />
          self-hosted. ground-up. moderated by humans, mostly.
        </div>
        <div>
          <span className="status-pill"><span style={{ color: "var(--text-mid)" }}>All systems operational</span></span>
        </div>
        <div>
          ◇ <a href="/about" className="no-underline">manifesto</a><br />
          ◇ <a href="/discord" className="no-underline">discord</a><br />
          ◇ <a href="https://deadplug.digital" className="no-underline">deadplug.digital</a><br />
          ◇ {year} — every right deserved, none reserved
        </div>
      </div>
    </footer>
  );
}
