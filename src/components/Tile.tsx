import type { ReactNode } from "react";

type Props = {
  index: string;
  glyph: string;
  title: string;
  body: ReactNode;
  tags?: string[];
  stamp?: string;
  skew?: "l" | "r";
};

export default function Tile({ index, glyph, title, body, tags = [], stamp, skew }: Props) {
  const skewClass = skew === "l" ? "skew-l" : skew === "r" ? "skew-r" : "";
  return (
    <article className={`tile jitter-hover ${skewClass}`} data-stamp={stamp ?? ""}>
      <span className="tile-index">{index}</span>
      <span className="tile-glyph" aria-hidden>{glyph}</span>
      <h3 className="tile-title">{title}</h3>
      <p className="tile-body">{body}</p>
      {tags.length > 0 && (
        <div className="tile-tags">
          {tags.map((t) => <span key={t}>{t}</span>)}
        </div>
      )}
    </article>
  );
}
