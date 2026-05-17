type Testimonial = {
  quote: string;
  cite: string;
  rating?: string; // glyph string e.g. "☢☢☢☢"
};

const DEFAULTS: Testimonial[] = [
  {
    quote: "I lost something here and I cannot tell anyone what.",
    cite: "A Reader, Probably",
    rating: "★ ★ ★ ☆ ✖",
  },
  {
    quote: "Recommended by my therapist, with reservations and a follow-up call.",
    cite: "Anonymous, Cleveland",
    rating: "☢ ☢ ☢ ☢",
  },
  {
    quote: "Possession of this page is illegal in fourteen nations.",
    cite: "A Lawyer We Don't Know",
    rating: "✚ ✚ ✚",
  },
  {
    quote: "I clicked the wheel and my tinnitus stopped.",
    cite: "H., Indiana",
    rating: "✱ ✱ ✱ ✱ ✱",
  },
  {
    quote: "I will not be returning. I have already returned.",
    cite: "Former Visitor, current visitor",
    rating: "☠ ☠ ☠",
  },
  {
    quote: "It looked at me the same way my father did.",
    cite: "Subject 11, Off The Record",
    rating: "◉ ◉ ◉ ◉",
  },
];

export default function SeenOn({ items = DEFAULTS }: { items?: Testimonial[] }) {
  return (
    <div className="seen-on">
      {items.map((t, i) => (
        <figure className="testimonial jitter-hover" key={i}>
          <blockquote>{t.quote}</blockquote>
          <cite>{t.cite}</cite>
          {t.rating && <div className="rating" aria-hidden>{t.rating}</div>}
        </figure>
      ))}
    </div>
  );
}
