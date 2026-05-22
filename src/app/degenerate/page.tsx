import type { Metadata } from "next";
import "./degenerate.css";
import DegenerateApp from "./DegenerateApp";

// Unlisted while it bakes — not linked in Nav, kept out of the index.
export const metadata: Metadata = {
  title: "DeGENERATE — Image Laboratory",
  description:
    "A browser image laboratory. Load a picture, deface it with text, grade it, run it through the effect stack, and drop the result straight into the queue.",
  robots: { index: false, follow: false },
};

export default function DegeneratePage() {
  return (
    <section className="dg-root">
      <header className="dg-masthead">
        <span className="dg-masthead-eyebrow">{"// instrument · unlisted · runs in your browser"}</span>
        <h1 className="dg-masthead-title">
          De<span>GEN</span>erate
        </h1>
        <p className="dg-masthead-blurb">
          An image laboratory. Load a picture, brand it with text from the font morgue, grade it
          cold, run it through the effect stack — then send the result straight to the queue.
        </p>
      </header>
      <DegenerateApp />
    </section>
  );
}
