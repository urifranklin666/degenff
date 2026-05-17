/**
 * Slow-spinning cursed wheel — pure CSS conic-gradient with an inner iris.
 * Labels float at fixed angles around the wheel via inline transform.
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

export default function PrizeWheel() {
  return (
    <div className="prize-wheel-wrap" aria-hidden>
      <div className="prize-wheel-pointer" />
      <div className="prize-wheel" />
      <div className="prize-wheel-labels">
        {LABELS.map((label, i) => {
          const deg = (360 / LABELS.length) * i - 90 + 22.5; // center of wedge
          const r = 42; // % from center
          return (
            <span
              key={label}
              style={{
                transform: `rotate(${deg}deg) translate(${r}%) rotate(${-deg}deg) translate(-50%, -50%)`,
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
