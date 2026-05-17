"use client";

import { useEffect, useRef } from "react";

/**
 * Rotating eye that follows the cursor. Hidden over form fields so typing
 * stays sane. CSS sets `body { cursor: none }` and restores text cursor on
 * input/textarea/select/[contenteditable]; this component renders the eye.
 */
export default function EyeCursor() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let nextX = window.innerWidth / 2;
    let nextY = window.innerHeight / 2;
    let curX = nextX;
    let curY = nextY;

    const isFormField = (t: EventTarget | null) => {
      if (!(t instanceof Element)) return false;
      return !!t.closest("input, textarea, select, [contenteditable=true]");
    };

    const onMove = (e: MouseEvent) => {
      nextX = e.clientX;
      nextY = e.clientY;
      el.classList.toggle("hidden", isFormField(e.target));
    };
    const onLeave = () => el.classList.add("hidden");
    const onEnter = () => el.classList.remove("hidden");

    const tick = () => {
      // small lerp so the eye trails slightly — feels less like a video-game crosshair
      curX += (nextX - curX) * 0.45;
      curY += (nextY - curY) * 0.45;
      el.style.transform = `translate(${curX}px, ${curY}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  return (
    <div ref={ref} className="eye-cursor" aria-hidden
      style={{ transform: "translate(50vw, 50vh) translate(-50%, -50%)" }}
    >
      <svg viewBox="0 0 60 36" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff2e7c" />
            <stop offset="55%" stopColor="#cc0000" />
            <stop offset="100%" stopColor="#1a0000" />
          </radialGradient>
        </defs>
        {/* vesica piscis */}
        <path
          d="M 2 18 Q 30 -6 58 18 Q 30 42 2 18 Z"
          fill="#fff"
          stroke="#000"
          strokeWidth="2"
        />
        {/* iris */}
        <g className="eye-iris">
          <circle cx="30" cy="18" r="10" fill="url(#iris)" stroke="#000" strokeWidth="1" />
          <circle cx="30" cy="18" r="4" fill="#000" />
          <circle cx="33" cy="15" r="1.4" fill="#fff" opacity="0.85" />
        </g>
      </svg>
    </div>
  );
}
