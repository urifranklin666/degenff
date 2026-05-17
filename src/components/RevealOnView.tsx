"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps content; adds class `is-in` when the wrapper enters the viewport,
 * triggering the .reveal-on-view CSS animation (fade up + red flash).
 */
export default function RevealOnView({
  children,
  className = "",
  threshold = 0.18,
}: {
  children: ReactNode;
  className?: string;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            io.unobserve(el);
          }
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={`reveal-on-view ${className}`}>
      {children}
    </div>
  );
}
