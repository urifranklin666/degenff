"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: Array<{ href: string; label: string; glyph: string }> = [
  { href: "/ops",          label: "Overview", glyph: "◆" },
  { href: "/ops/queue",    label: "Queue",    glyph: "◇" },
  { href: "/ops/services", label: "Services", glyph: "⬢" },
  { href: "/ops/deploy",   label: "Deploy",   glyph: "◈" },
  { href: "/ops/discord",  label: "Discord",  glyph: "◉" },
  { href: "/ops/storage",  label: "Storage",  glyph: "⬡" },
];

export default function OpsSubnav() {
  const pathname = usePathname();
  return (
    <nav className="ops-subnav" aria-label="Ops sections">
      {ITEMS.map(({ href, label, glyph }) => {
        const active = href === "/ops" ? pathname === "/ops" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`ops-subnav-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden>{glyph}</span> {label}
          </Link>
        );
      })}
    </nav>
  );
}
