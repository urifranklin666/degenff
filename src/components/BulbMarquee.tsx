type Props = {
  items: string[];
  /** color per item — cycles through. defaults to a/b/c/d order */
  pattern?: ("a" | "b" | "c" | "d")[];
};

export default function BulbMarquee({
  items,
  pattern = ["a", "b", "c", "d"],
}: Props) {
  const doubled = [...items, ...items];
  return (
    <div className="bulb-marquee" aria-hidden>
      <div className="track">
        {doubled.map((item, i) => (
          <span key={i}>
            <span className={`word ${pattern[i % pattern.length]}`}>{item}</span>
            <span className="glyph">✻</span>
          </span>
        ))}
      </div>
    </div>
  );
}
