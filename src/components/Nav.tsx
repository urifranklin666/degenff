import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav" aria-label="Primary">
      <div className="container nav-inner">
        <Link href="/" className="brand no-underline" aria-label="degeneratefuckface.com home">
          <span className="brand-mark" aria-hidden />
          <span>
            degenerate<span className="brand-dot">.</span>fuckface
            <span className="brand-host">.com</span>
          </span>
        </Link>
        <div className="nav-links" role="menubar">
          <Link href="/submissions" role="menuitem">Submissions</Link>
          <Link href="/feats" role="menuitem">Feats</Link>
          <Link href="/discord" role="menuitem">Discord</Link>
          <Link href="/about" role="menuitem">About</Link>
          <Link href="/submit" role="menuitem" className="btn no-underline" style={{ padding: "0.45rem 0.85rem" }}>
            Submit
          </Link>
        </div>
      </div>
    </nav>
  );
}
