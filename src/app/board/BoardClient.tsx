"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { submitLetter } from "@/app/actions/board";
import { MAX_CHARS, type BoardSnapshot, type LetterAction } from "@/lib/board";

type SpiritEvent = { sessionId: string; seq: number; char: string; done: boolean };
type SpiritState = { sessionId: string; text: string; channeling: boolean } | null;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const POLL_MS = 2500;

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function BoardClient({
  initial,
  canType,
}: {
  initial: BoardSnapshot;
  canType: boolean;
}) {
  const [snap, setSnap] = useState<BoardSnapshot>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState<number>(initial.remainingCooldownSec);
  const [spirit, setSpirit] = useState<SpiritState>(null);
  const tickRef = useRef<number | null>(null);

  // Watch the séance wire: the barker paces the spirit's reply out one
  // letter at a time; every open board sees the planchette move together.
  useEffect(() => {
    const es = new EventSource("/api/board/stream");
    es.addEventListener("spirit", (e) => {
      const ev = JSON.parse((e as MessageEvent).data) as SpiritEvent;
      setSpirit((prev) => {
        if (ev.done) {
          return prev && prev.sessionId === ev.sessionId
            ? { ...prev, channeling: false }
            : prev;
        }
        if (!prev || prev.sessionId !== ev.sessionId) {
          return { sessionId: ev.sessionId, text: ev.char, channeling: true };
        }
        return { ...prev, text: prev.text + ev.char, channeling: true };
      });
    });
    return () => es.close();
  }, []);

  // Poll the snapshot periodically so other users' letters appear.
  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const r = await fetch("/api/board/state", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as BoardSnapshot;
        setSnap((prev) => (data.text === prev.text && data.status === prev.status && data.recent.length === prev.recent.length ? prev : data));
        setCooldown(data.remainingCooldownSec);
      } catch {
        // silent — next tick retries
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  // Local cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    tickRef.current = window.setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [cooldown]);

  const press = useCallback(
    (action: LetterAction) => {
      if (!canType) return;
      if (cooldown > 0) return;
      setError(null);
      startTransition(async () => {
        const result = await submitLetter(action);
        if (!result.ok) {
          setError(result.error);
          if (result.snapshot) {
            setSnap(result.snapshot);
            setCooldown(result.snapshot.remainingCooldownSec);
          }
          return;
        }
        setSnap(result.snapshot);
        setCooldown(result.snapshot.remainingCooldownSec);
      });
    },
    [canType, cooldown],
  );

  // Keyboard support: A–Z, space, backspace.
  useEffect(() => {
    if (!canType) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === " ") {
        e.preventDefault();
        press({ kind: "space" });
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        press({ kind: "delete" });
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        press({ kind: "letter", char: e.key.toUpperCase() });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canType, press]);

  const disabled = !canType || pending || cooldown > 0 || snap.text.length >= MAX_CHARS;

  return (
    <div className="board">
      <div className="board-display" aria-live="polite">
        <div className="board-sentence-row">
          {snap.text.split("").map((ch, i) => (
            <span key={i} className={`board-tile${ch === " " ? " is-space" : ""}`}>{ch === " " ? "·" : ch}</span>
          ))}
          {snap.text.length < MAX_CHARS && (
            <span className="board-tile board-tile-blink" aria-hidden>▓</span>
          )}
        </div>
        <div className="board-counter">
          <span>{snap.text.length}</span>
          <span className="board-counter-sep">/</span>
          <span>{MAX_CHARS}</span>
          <span className="board-counter-label">chars</span>
        </div>
      </div>

      {spirit && (
        <div className={`board-spirit${spirit.channeling ? " is-channeling" : ""}`} aria-live="polite">
          <span className="board-spirit-label">
            {spirit.channeling ? "the other side is answering" : "the other side said"}
          </span>
          <div className="board-sentence-row">
            {spirit.text.split("").map((ch, i) => (
              <span key={i} className={`board-tile is-spirit${ch === " " ? " is-space" : ""}`}>
                {ch === " " ? "·" : ch}
              </span>
            ))}
            {spirit.channeling && <span className="board-tile is-spirit board-tile-blink" aria-hidden>▓</span>}
          </div>
        </div>
      )}

      <div className="board-status">
        {canType ? (
          cooldown > 0 ? (
            <p className="board-status-cool">Next letter unlocks in <strong>{cooldown}s</strong>.</p>
          ) : pending ? (
            <p className="board-status-cool">Pressing…</p>
          ) : (
            <p className="board-status-go">The planchette is yours.</p>
          )
        ) : (
          <p className="board-status-cool">Read-only. Sign in to add a letter.</p>
        )}
        {error && <p className="board-status-error">{error}</p>}
      </div>

      <div className="board-grid" role="group" aria-label="Letter grid">
        {ALPHABET.map((ch) => (
          <button
            type="button"
            key={ch}
            className="board-key"
            disabled={disabled}
            onClick={() => press({ kind: "letter", char: ch })}
            aria-label={`Letter ${ch}`}
          >
            {ch}
          </button>
        ))}
        <button
          type="button"
          className="board-key board-key-wide"
          disabled={disabled}
          onClick={() => press({ kind: "space" })}
        >
          space
        </button>
        <button
          type="button"
          className="board-key board-key-wide"
          disabled={!canType || pending || cooldown > 0 || snap.text.length === 0}
          onClick={() => press({ kind: "delete" })}
        >
          delete
        </button>
      </div>

      <div className="board-meta">
        <h3 className="board-sub-title">fingers on the planchette</h3>
        {snap.contributors.length === 0 ? (
          <p className="board-meta-empty">no one yet. be the first.</p>
        ) : (
          <ul className="board-contributors">
            {snap.contributors.map((c, i) => (
              <li key={`${c.handle}-${i}`} className="board-contributor">
                <span aria-hidden>◇</span>
                <span>@{c.handle}</span>
                <span className="board-contributor-count">×{c.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="board-recent">
        <h3 className="board-sub-title">previous transmissions</h3>
        {snap.recent.length === 0 ? (
          <p className="board-meta-empty">no sentences have locked yet.</p>
        ) : (
          <ol className="board-recent-list">
            {snap.recent.map((r) => (
              <li key={r.id} className="board-recent-item">
                <blockquote>{r.text}</blockquote>
                {r.spiritReply && (
                  <blockquote className="board-recent-reply">↳ {r.spiritReply}</blockquote>
                )}
                <p className="board-recent-meta">
                  <span>{timeAgo(r.lockedAt)}</span>
                  <span className="board-counter-sep">·</span>
                  <span>signed: {r.contributors.map((h) => `@${h}`).join(", ")}</span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
