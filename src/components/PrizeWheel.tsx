/**
 * Slow-spinning cursed wheel — pure CSS conic-gradient with an inner iris.
 * Labels are positioned with CSS sin/cos so they sit on their wedges, and
 * spin together with the wheel via a matching animation on the labels layer.
 *
 * Conic-gradient default starts at 0deg = top, sweeping clockwise.
 * Wedge i covers (i*45)..(i+1)*45; label sits at the wedge center i*45+22.5.
 *   x_offset = sin(angle) * r   (right = +)
 *   y_offset = -cos(angle) * r  (CSS top, top = -)
 */
const LABELS = [
  "LOSE",
  "WATCHED",
  "AGAIN",
  "DECEASED",
  "PUNISHED",
  "MISSING",
  "BLEED",
  "WAIT",
];

const RADIUS = 36; // % of wrapper

export default function PrizeWheel() {
  return (
    <div className="prize-wheel-wrap" aria-hidden>
      <div className="prize-wheel-pointer" />
      <div className="prize-wheel" />
      <div className="prize-wheel-labels">
        {LABELS.map((label, i) => {
          const angle = i * 45 + 22.5;
          return (
            <span
              key={label}
              style={{
                left: `calc(50% + sin(${angle}deg) * ${RADIUS}%)`,
                top: `calc(50% - cos(${angle}deg) * ${RADIUS}%)`,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
