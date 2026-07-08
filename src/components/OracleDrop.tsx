import { pickOracleLine } from "@/lib/oracle";

/**
 * Small manifesto-voice callout that re-randomizes on every page render.
 * Shares the line pool with the Discord bot's "drop" scheduler so the two
 * surfaces speak the same dialect.
 */
export default function OracleDrop() {
  const line = pickOracleLine();
  return (
    <div className="oracle-drop" role="note" aria-label="Evidence drop">
      <span className="oracle-glyph" aria-hidden>▮</span>
      <span className="oracle-line"><em>{line}</em></span>
      <span className="oracle-tag">{"// evidence drop · the goose, intermittent"}</span>
    </div>
  );
}
