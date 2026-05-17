/**
 * Bottom-right corner monitor. Pure CSS — looks like a hospital bedside ECG
 * but the patient is the website. Pinned via position:fixed.
 */
export default function Heartbeat() {
  return (
    <aside className="heartbeat" aria-hidden>
      <div className="row"><span className="label">SUBJECT</span><span className="val">degenff</span></div>
      <div className="row"><span className="label">STATUS</span><span className="val">UNWELL</span></div>
      <div className="ecg" />
      <div className="row"><span className="label">BPM</span><span className="val">177</span></div>
    </aside>
  );
}
