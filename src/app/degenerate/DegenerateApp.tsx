"use client";

// DeGENERATE — client entry. The editor is loaded ssr:false because Pixi.js
// touches `window`/`document` and must never run during server render.
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="dg-shell dg-shell-boot" aria-busy>
      <span className="dg-boot-glyph" aria-hidden>
        ◈
      </span>
      <span>loading the laboratory…</span>
    </div>
  ),
});

export default function DegenerateApp() {
  return <Editor />;
}
