import type { ReactNode } from "react";

/**
 * RGB chromatic-aberration headline. Renders the same text three times:
 * the base layer (white), cyan offset, fuchsia offset — driven by the
 * .glitch class in globals.css.
 */
export default function Glitch({
  text,
  as: Tag = "span",
  className,
}: {
  text: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}) {
  const Component = Tag as unknown as React.ElementType;
  return (
    <Component className={`glitch ${className ?? ""}`} data-text={text}>
      {text as ReactNode}
    </Component>
  );
}
