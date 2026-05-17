/**
 * Slow-spinning prize wheel made entirely of conic-gradient + box-shadow.
 * Decoration only — no inputs, no aria role.
 */
export default function PrizeWheel() {
  return (
    <div className="prize-wheel-wrap" aria-hidden>
      <div className="prize-wheel-pointer" />
      <div className="prize-wheel" />
    </div>
  );
}
