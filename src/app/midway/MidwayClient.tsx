"use client";

import { useRef, useState } from "react";
import { pullTooth, scratchCard, spinWheel, type MidwayResult } from "@/app/actions/midway";
import { WHEEL_WEDGES } from "@/lib/midway-shared";

const RADIUS = 36;
const WEDGE_DEG = 360 / WHEEL_WEDGES.length;

/**
 * The three attractions. Outcomes are decided server-side; the client only
 * animates toward whatever the house already ruled.
 */
export default function MidwayClient({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="midway-floor">
      <WheelBooth signedIn={signedIn} />
      <ScratchBooth signedIn={signedIn} />
      <ToothBooth signedIn={signedIn} />
    </div>
  );
}

function useBooth() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MidwayResult | null>(null);
  return { busy, setBusy, result, setResult };
}

function ResultLine({ result }: { result: MidwayResult | null }) {
  if (!result) return null;
  if (!result.ok) return <p className="midway-result is-error">{result.error}</p>;
  return (
    <p className="midway-result">
      {result.award ? (
        <>
          <span className={`midway-won is-${result.award.kind}`}>
            {result.award.kind === "title" ? "◈ TITLE" : "◆ STAMP"} · {result.award.label}
          </span>
          <span className="midway-flavor">{result.message}</span>
        </>
      ) : (
        <span className="midway-flavor">{result.message}</span>
      )}
    </p>
  );
}

/* ── the wheel ───────────────────────────────────────────────────────── */

function WheelBooth({ signedIn }: { signedIn: boolean }) {
  const { busy, setBusy, result, setResult } = useBooth();
  const [rotation, setRotation] = useState(0);
  const [settled, setSettled] = useState(true);
  const turns = useRef(0);

  async function spin() {
    if (busy || !signedIn) return;
    setBusy(true);
    setResult(null);
    const r = await spinWheel();
    if (!r.ok) {
      setResult(r);
      setBusy(false);
      return;
    }
    // Land the wedge center under the top pointer, always spinning forward.
    turns.current += 6;
    const target = turns.current * 360 - ((r.wedgeIndex ?? 0) * WEDGE_DEG + WEDGE_DEG / 2);
    setSettled(false);
    setRotation(target);
    window.setTimeout(() => {
      setResult(r);
      setSettled(true);
      setBusy(false);
    }, 5200);
  }

  return (
    <div className="midway-booth">
      <h2 className="midway-booth-title">01 · The Wheel</h2>
      <p className="midway-booth-sub">one spin per soul per day. the wheel remembers.</p>
      <div className="prize-wheel-wrap midway-wheel" data-spinning={!settled || undefined}>
        <div className="prize-wheel-pointer" />
        <div
          className="prize-wheel"
          style={{
            animation: "none",
            transform: `rotate(${rotation}deg)`,
            transition: settled && rotation === 0 ? "none" : "transform 5s cubic-bezier(0.12, 0.8, 0.18, 1)",
          }}
        />
        <div
          className="prize-wheel-labels"
          style={{
            animation: "none",
            transform: `rotate(${rotation}deg)`,
            transition: settled && rotation === 0 ? "none" : "transform 5s cubic-bezier(0.12, 0.8, 0.18, 1)",
          }}
        >
          {WHEEL_WEDGES.map((w, i) => {
            const angle = i * WEDGE_DEG + WEDGE_DEG / 2;
            return (
              <span
                key={w.label}
                style={{
                  left: `calc(50% + sin(${angle}deg) * ${RADIUS}%)`,
                  top: `calc(50% - cos(${angle}deg) * ${RADIUS}%)`,
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                }}
              >
                {w.label}
              </span>
            );
          })}
        </div>
      </div>
      <button type="button" className="btn" onClick={() => void spin()} disabled={busy || !signedIn}>
        {busy ? "Spinning" : "Spin"}
      </button>
      <ResultLine result={result} />
    </div>
  );
}

/* ── scratch cards ───────────────────────────────────────────────────── */

function ScratchBooth({ signedIn }: { signedIn: boolean }) {
  const { busy, setBusy, result, setResult } = useBooth();
  const [scratched, setScratched] = useState(false);

  async function buy() {
    if (busy || !signedIn) return;
    setBusy(true);
    setScratched(false);
    setResult(null);
    const r = await scratchCard();
    setResult(r);
    setBusy(false);
  }

  const reveal = result?.ok ? result.reveal : null;

  return (
    <div className="midway-booth">
      <h2 className="midway-booth-title">02 · Scratch Cards</h2>
      <p className="midway-booth-sub">three a day. the foil knows what it&apos;s hiding.</p>
      <div
        className={`midway-card${reveal ? " has-card" : ""}${scratched ? " is-scratched" : ""}`}
        onClick={() => reveal && setScratched(true)}
        role={reveal ? "button" : undefined}
        tabIndex={reveal ? 0 : undefined}
        onKeyDown={(e) => reveal && (e.key === "Enter" || e.key === " ") && setScratched(true)}
        aria-label={reveal ? "Scratch the card" : undefined}
      >
        {reveal ? (
          <>
            <span className="midway-card-reveal">{reveal}</span>
            <span className="midway-card-foil" aria-hidden>SCRATCH&nbsp;HERE</span>
          </>
        ) : (
          <span className="midway-card-empty">{busy ? "printing…" : "no card in hand"}</span>
        )}
      </div>
      <button type="button" className="btn" onClick={() => void buy()} disabled={busy || !signedIn}>
        {busy ? "Printing" : "Take a card"}
      </button>
      {scratched && <ResultLine result={result} />}
      {!scratched && result && !result.ok && <ResultLine result={result} />}
    </div>
  );
}

/* ── the tooth jar ───────────────────────────────────────────────────── */

function ToothBooth({ signedIn }: { signedIn: boolean }) {
  const { busy, setBusy, result, setResult } = useBooth();
  const [shaking, setShaking] = useState(false);

  async function pull() {
    if (busy || !signedIn) return;
    setBusy(true);
    setResult(null);
    setShaking(true);
    const r = await pullTooth();
    window.setTimeout(() => {
      setShaking(false);
      setResult(r);
      setBusy(false);
    }, 1400);
  }

  const tooth = result?.ok ? result.tooth : null;

  return (
    <div className="midway-booth">
      <h2 className="midway-booth-title">03 · The Tooth Jar</h2>
      <p className="midway-booth-sub">one pull a day. all sales final. all teeth real.</p>
      <div className={`midway-jar${shaking ? " is-shaking" : ""}`} aria-hidden>
        <div className="midway-jar-lid" />
        <div className="midway-jar-body">
          <span className={`midway-jar-tooth${tooth === "gold" ? " is-gold" : ""}`}>
            {tooth ? (tooth === "gold" ? "◆" : "𐤟") : "𐤟𐤟𐤟"}
          </span>
        </div>
      </div>
      <button type="button" className="btn" onClick={() => void pull()} disabled={busy || !signedIn}>
        {busy ? "Reaching in" : "Pull a tooth"}
      </button>
      <ResultLine result={result} />
    </div>
  );
}
