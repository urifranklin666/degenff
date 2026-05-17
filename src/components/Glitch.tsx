import type { ReactNode } from "react";

/**
 * RGB chromatic-aberration headline. Optionally cycles through alt-text
 * values that briefly flash in to replace the primary. Use sparingly.
 *
 *   <Glitch text="DEGENERATE" alts={["DECOMPOSE", "DESECRATE"]} />
 */
type Tag = keyof React.JSX.IntrinsicElements;

export default function Glitch({
  text,
  alts,
  as = "span" as Tag,
  className,
}: {
  text: string;
  alts?: string[];
  as?: Tag;
  className?: string;
}) {
  const Component = as as unknown as React.ElementType;
  const base = (
    <Component className={`glitch ${className ?? ""}`} data-text={text}>
      {text as ReactNode}
    </Component>
  );

  if (!alts || alts.length === 0) return base;

  return (
    <span className="glitch-cycle">
      {base}
      {alts.slice(0, 2).map((alt, i) => (
        <span key={i} className={`alt alt-${i + 1}`} aria-hidden>
          <span className="glitch" data-text={alt}>{alt}</span>
        </span>
      ))}
    </span>
  );
}
