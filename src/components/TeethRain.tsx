/**
 * Slow-falling-teeth ambient layer. Pure CSS animation; positions and
 * delays are deterministic per-index so SSR and client agree.
 */
type Props = { count?: number };

export default function TeethRain({ count = 14 }: Props) {
  const teeth = Array.from({ length: count }, (_, i) => {
    const leftPct = (i * 73) % 100;             // pseudo-random spread
    const delaySec = ((i * 1.37) % 8).toFixed(2);
    const durSec = (7 + (i % 5)).toFixed(2);    // 7–11s
    const sizePx = 12 + (i % 4) * 3;            // 12–21px
    const rotateDeg = (i * 47) % 60 - 30;
    return (
      <span
        key={i}
        className="tooth"
        style={{
          left: `${leftPct}%`,
          width: `${sizePx}px`,
          height: `${sizePx * 1.25}px`,
          animationDelay: `-${delaySec}s`,
          animationDuration: `${durSec}s`,
          transform: `rotate(${rotateDeg}deg)`,
        }}
      />
    );
  });

  return (
    <div className="teeth-rain" aria-hidden>
      {teeth}
    </div>
  );
}
