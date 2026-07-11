"use client";

import { useEffect, useRef, useState } from "react";

type Status = {
  onAir: boolean;
  nowPlaying?: string;
  kind?: "music" | "ident" | "dead-air";
  listeners?: number;
  uptimeSec?: number;
  history?: Array<{ title: string; at: string }>;
};

const STATUS_POLL_MS = 15_000;

function fmtUptime(sec?: number): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function RadioClient() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/radio/status", { cache: "no-store" });
        if (live && r.ok) setStatus((await r.json()) as Status);
      } catch {
        if (live) setStatus({ onAir: false });
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), STATUS_POLL_MS);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      // Drop the connection entirely — a paused live stream is a stale one.
      el.removeAttribute("src");
      el.load();
      setPlaying(false);
    } else {
      el.src = "/api/radio/stream";
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  const onAir = status?.onAir ?? false;

  return (
    <div className="radio-set">
      <audio ref={audioRef} preload="none" />
      <div className={`radio-face${playing ? " is-playing" : ""}`}>
        <div className="radio-face-top">
          <span className={`radio-onair${onAir ? " is-on" : ""}`}>
            {onAir ? "◉ ON AIR" : "○ OFF AIR"}
          </span>
          <span className="radio-listeners">
            {status?.listeners !== undefined ? `${status.listeners} tuned in` : ""}
          </span>
          <span className="radio-uptime">tx up {fmtUptime(status?.uptimeSec)}</span>
        </div>

        <div className="radio-now">
          <span className="radio-now-label">
            {status?.kind === "ident" ? "station ident" : status?.kind === "dead-air" ? "dead air" : "now playing"}
          </span>
          <span className="radio-now-title">
            {onAir ? status?.nowPlaying ?? "…" : "the transmitter is down. someone kicked the plug."}
          </span>
        </div>

        <button type="button" className="btn" onClick={toggle} disabled={!onAir}>
          {playing ? "■ Kill the feed" : "▶ Tune in"}
        </button>
      </div>

      {status?.history && status.history.length > 0 && (
        <div className="radio-log">
          <h2 className="contrib-h">{"// transmission log"}</h2>
          <ul className="radio-log-list">
            {status.history.map((h, i) => (
              <li key={`${h.at}-${i}`}>
                <span className="radio-log-time" suppressHydrationWarning>
                  {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
                <span>{h.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
