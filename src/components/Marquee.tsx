type Props = { items: string[]; glyph?: string };

export default function Marquee({ items, glyph = "◆" }: Props) {
  // Double the list so the loop is seamless when translating -50%.
  const doubled = [...items, ...items];
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", gap: "2.5rem", alignItems: "center" }}>
            {item}
            <span className="glyph">{glyph}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
