/**
 * Top-of-page classification strip. Reads like a declassified intel sweep.
 * Server component — timestamp is whatever the server saw on render.
 */
export default function ClassificationBanner() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getUTCFullYear()}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())}//${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}Z`;
  const fileNum = String(((now.getUTCMonth() * 31 + now.getUTCDate()) * 7 + now.getUTCHours()) % 1000).padStart(3, "0");

  return (
    <div className="classification" role="presentation" aria-hidden>
      <div className="classification-inner">
        <span className="live">LIVE</span>
        <span className="sep">{"//"}</span>
        <span>FILE NO·{fileNum}</span>
        <span className="sep">{"//"}</span>
        <span>{ts}</span>
        <span className="sep">{"//"}</span>
        <span>BAR PATRONS ONLY</span>
        <span className="sep">{"//"}</span>
        <span>NO ATTORNEY PRESENT</span>
        <span className="sep">{"//"}</span>
        <span>SHOES OFF</span>
        <span className="sep">{"//"}</span>
        <span>PROCEED VOLUNTARILY</span>
        <span className="sep">{"//"}</span>
        <span>ON THE RECORD</span>
        <span className="sep">::</span>
        <span>SUBJECT·DEGENFF</span>
      </div>
    </div>
  );
}
