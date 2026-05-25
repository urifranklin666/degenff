"use client";

import { useEffect } from "react";

/**
 * Sets a 0→1 CSS custom property on :root as the user scrolls past the
 * first viewport. Consumers (e.g. .glitch-react, body filters) read it
 * via var(--scroll-glitch, 0). No state — DOM only, so no re-renders.
 */
export default function ScrollGlitch() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const root = document.documentElement;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const max = Math.max(window.innerHeight, 1);
      const v = Math.min(1, Math.max(0, window.scrollY / max));
      root.style.setProperty("--scroll-glitch", v.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      root.style.removeProperty("--scroll-glitch");
    };
  }, []);

  return null;
}
