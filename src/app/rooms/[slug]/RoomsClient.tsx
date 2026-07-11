"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postRoomMessage } from "@/app/actions/rooms";
import { BARKER_USER_ID, MAX_MESSAGE_CHARS, type WireMessage } from "@/lib/rooms-shared";

type Presence = { userId: string; handle: string; image: string | null };

const MAX_RENDERED = 400;
const GROUP_GAP_MS = 5 * 60_000;

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function RoomsClient({
  room,
  initial,
  meId,
}: {
  room: { id: string; slug: string; topic: string | null };
  initial: WireMessage[];
  meId: string;
}) {
  const [msgs, setMsgs] = useState<WireMessage[]>(initial);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [wireUp, setWireUp] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef(true);

  const append = useCallback((m: WireMessage) => {
    setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m].slice(-MAX_RENDERED)));
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/rooms/${room.slug}/stream`);
    es.addEventListener("msg", (e) => append(JSON.parse((e as MessageEvent).data) as WireMessage));
    es.addEventListener("presence", (e) => setPresence(JSON.parse((e as MessageEvent).data) as Presence[]));
    es.onopen = () => setWireUp(true);
    es.onerror = () => setWireUp(false); // EventSource retries on its own
    return () => es.close();
  }, [room.slug, append]);

  // Follow the bottom unless the reader scrolled up into history.
  useEffect(() => {
    const log = logRef.current;
    if (log && stickyRef.current) log.scrollTop = log.scrollHeight;
  }, [msgs]);

  const onScroll = () => {
    const log = logRef.current;
    if (!log) return;
    stickyRef.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  };

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const result = await postRoomMessage(room.slug, body);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    stickyRef.current = true;
    append(result.message);
    setDraft("");
  }, [draft, sending, room.slug, append]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="rooms-main" data-room={room.slug}>
      <div className="rooms-log" ref={logRef} onScroll={onScroll} aria-live="polite">
        {msgs.length === 0 && (
          <p className="rooms-empty">nothing yet. the room is listening.</p>
        )}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const grouped =
            prev &&
            prev.author?.id === m.author?.id &&
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_GAP_MS;
          const author = m.author;
          const isBarker = author?.id === BARKER_USER_ID;
          const isMod = author?.role === "mod" || author?.role === "admin";
          return (
            <div key={m.id} className={`rooms-msg${grouped ? " is-grouped" : ""}`}>
              {!grouped && (
                <div className="rooms-msg-head">
                  <span
                    className={`rooms-msg-author${isBarker ? " is-barker" : ""}${author?.id === meId ? " is-me" : ""}`}
                  >
                    @{author?.handle ?? "ghost"}
                  </span>
                  {isBarker && <span className="rooms-msg-role is-barker">resident</span>}
                  {!isBarker && isMod && <span className="rooms-msg-role">{author?.role}</span>}
                  {!isBarker && author?.title && <span className="rooms-msg-role is-title">{author.title}</span>}
                  <span className="rooms-msg-time" suppressHydrationWarning>{fmtTime(m.createdAt)}</span>
                </div>
              )}
              <p className="rooms-msg-body">{m.body}</p>
            </div>
          );
        })}
      </div>

      <div className="rooms-presence">
        <span className={`rooms-wire${wireUp ? " is-up" : ""}`}>
          {wireUp ? "◉ wire live" : "○ wire down — retrying"}
        </span>
        <span className="rooms-presence-count">{presence.length} in the room</span>
        <span className="rooms-presence-list">
          {presence.map((p, i) => (
            <span key={p.userId} className={p.userId === BARKER_USER_ID ? "is-barker" : undefined}>
              {i > 0 && " "}@{p.handle}
            </span>
          ))}
        </span>
      </div>

      <div className="rooms-composer">
        <textarea
          className="rooms-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={MAX_MESSAGE_CHARS}
          placeholder={`speak into #${room.slug} — enter sends, shift+enter breaks the line`}
          aria-label={`Message #${room.slug}`}
        />
        <div className="rooms-composer-row">
          {error ? <span className="rooms-error">{error}</span> : <span />}
          <button type="button" className="btn" onClick={() => void send()} disabled={sending || draft.trim().length === 0}>
            {sending ? "Sending" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
