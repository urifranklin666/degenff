import type { ReactNode } from "react";

/**
 * Hover-to-reveal redacted bar. Use inline inside paragraphs.
 *   <Scratch cover="REDACTED">true text</Scratch>
 */
export default function Scratch({
  children,
  cover = "REDACTED",
}: {
  children: ReactNode;
  cover?: string;
}) {
  return (
    <span className="scratch" role="presentation">
      <span className="under">{children}</span>
      <span className="over" aria-hidden>{cover}</span>
    </span>
  );
}
