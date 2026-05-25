"use client";

import { useEffect, useRef } from "react";

interface Props {
  text: string;
  delay?: number;      // ms between characters
  startDelay?: number; // ms before the first character
  className?: string;
}

/**
 * Mechanical-typewriter reveal: characters fade up one at a time, with
 * each character animating its font-variation-settings wght axis from
 * thin → heavy as it lands, like ink darkening into place. Uses direct
 * DOM mutation (no React state) so it works fine inside the effect.
 */
export default function KineticType({
  text,
  delay = 38,
  startDelay = 80,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chars = Array.from(el.querySelectorAll<HTMLElement>(".char"));
    if (!chars.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      chars.forEach((c) => c.classList.add("is-on"));
      return;
    }

    let i = 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    const reveal = () => {
      if (i < chars.length) {
        chars[i].classList.add("is-on");
        i += 1;
        t = setTimeout(reveal, delay);
      }
    };
    const start = setTimeout(reveal, startDelay);
    return () => {
      clearTimeout(start);
      if (t) clearTimeout(t);
    };
  }, [delay, startDelay, text]);

  return (
    <span ref={ref} className={`kinetic-typewriter ${className}`.trim()} aria-label={text}>
      {Array.from(text).map((c, i) => (
        <span key={`${i}-${c}`} className="char" aria-hidden>
          {c === " " ? " " : c}
        </span>
      ))}
    </span>
  );
}
