import RadioClient from "./RadioClient";

export const metadata = {
  title: "Radio Degeneracy",
  description:
    "A transmitter bolted to the R630. Music around the clock, station idents by a voice with no body.",
};

export default function RadioPage() {
  return (
    <section className="section" style={{ paddingTop: "2.5rem" }}>
      <div className="container" style={{ maxWidth: "880px" }}>
        <p className="eyebrow">{"// broadcast division · 24/7 · loopback to the world"}</p>
        <h1 className="section-title">
          Radio <em>Degeneracy.</em>
        </h1>
        <p className="lede" style={{ marginBottom: "2rem", color: "var(--text)" }}>
          One transmitter, one server, zero licenses. Music from the crate, station idents
          by the Barker, occasional readings from the rooms. Leave it on in a tab.
          It likes that.
        </p>
        <RadioClient />
      </div>
    </section>
  );
}
