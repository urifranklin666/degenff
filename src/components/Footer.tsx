/**
 * Footer with a centerpiece thermal-receipt card. The receipt is the
 * brain-explode move — perforated bottom edge via mask, CSS barcode,
 * dossier serial, and a tagline that lands on the way out.
 */
export default function Footer() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = now.getUTCFullYear();
  const dateStr = `${year}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())}`;
  const monthSerial = String(((now.getUTCMonth() + 1) * 7919 + now.getUTCDate() * 31) % 9973).padStart(4, "0");
  const serial = `DEGEN-${year}-${monthSerial}`;
  const barcodeNum = `${monthSerial} ${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")} ${String(year).slice(-2)}`;

  return (
    <footer className="footer" aria-label="Site footer">
      <div className="container footer-inner">
        <div>
          <b>degeneratefuckface.com</b> — a deadplug.digital adjacent property.
          <br />
          self-hosted. ground-up. moderated by humans, mostly.
          <br />
          <br />
          <span className="status-pill">
            <span style={{ color: "var(--text-mid)" }}>All systems operational</span>
          </span>
        </div>

        <aside className="receipt" aria-hidden>
          <h5>** evidence receipt **</h5>
          <div className="row"><span>DATE</span><span className="v">{dateStr}</span></div>
          <div className="row"><span>TERMINAL</span><span className="v">T-007 // R630</span></div>
          <div className="row"><span>OPERATOR</span><span className="v">deadplug</span></div>
          <hr />
          <div className="row"><b>LINE</b><b>QTY</b></div>
          <div className="row"><span>page view</span><span className="v">×1</span></div>
          <div className="row"><span>soul</span><span className="v">forfeit</span></div>
          <div className="row"><span>guilt</span><span className="v">billed</span></div>
          <div className="row"><span>dignity</span><span className="v">past tense</span></div>
          <div className="row"><span>consent</span><span className="v">implied</span></div>
          <div className="row"><span>attention</span><span className="v">splintered</span></div>
          <div className="row"><span>posture</span><span className="v">concerning</span></div>
          <div className="row"><span>next of kin</span><span className="v">uninformed</span></div>
          <div className="row"><span>last meal</span><span className="v">none</span></div>
          <div className="row"><span>co-pay</span><span className="v">your peace</span></div>
          <div className="row"><span>refunds</span><span className="v">denied</span></div>
          <hr />
          <div className="row"><b>SERIAL</b><span className="v">{serial}</span></div>
          <div className="barcode" />
          <div className="barcode-num">{barcodeNum}</div>
          <div className="receipt-foot">— please do not thank us —</div>
        </aside>

        <div>
          ◇ <a href="/about" className="no-underline">manifesto</a><br />
          ◇ <a href="/discord" className="no-underline">discord</a><br />
          ◇ <a href="https://deadplug.digital" className="no-underline">deadplug.digital</a><br />
          ◇ {year} — every right deserved, none reserved
        </div>
      </div>
    </footer>
  );
}
