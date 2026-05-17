import type { ReactNode } from "react";

type Props = {
  index: string;
  glyph: string;
  title: string;
  body: ReactNode;
  tags?: string[];
};

export default function Tile({ index, glyph, title, body, tags = [] }: Props) {
  return (
    <article className="tile">
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
