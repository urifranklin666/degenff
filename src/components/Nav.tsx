import Link from "next/link";
import { auth } from "@/auth";

export default async function Nav() {
  const session = await auth();
  const role = session?.user?.role;
  const isOps = role === "mod" || role === "admin";

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
          <Link href="/feats" role="menuitem">Feats</Link>
          <Link href="/rooms" role="menuitem">Rooms</Link>
          <Link href="/board" role="menuitem">Séance</Link>
          <Link href="/radio" role="menuitem">Radio</Link>
          <Link href="/bureau" role="menuitem">Bureau</Link>
          <Link href="/dead" role="menuitem">Discord&nbsp;†</Link>
          <Link href="/about" role="menuitem">About</Link>
          {session?.user && (
            <Link href="/me" role="menuitem" className="nav-me">
              <span aria-hidden>◇</span> @{session.user.handle}
            </Link>
          )}
          {isOps && (
            <Link href="/ops" role="menuitem" className="nav-ops" aria-label="Operator control panel">
              <span aria-hidden>◆</span> Ops
            </Link>
          )}
          <Link href="/midway" role="menuitem" className="btn no-underline">Midway</Link>
        </div>
      </div>
    </nav>
  );
}
