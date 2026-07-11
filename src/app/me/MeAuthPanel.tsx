"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { addPasskeyOptions, addPasskeyVerify, logout } from "@/app/actions/passkey";

export type PasskeyRow = {
  id: string;
  label: string | null;
  deviceType: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

export default function MeAuthPanel({ keys }: { keys: PasskeyRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function addKey() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const opts = await addPasskeyOptions();
      if (!opts.ok) throw new Error(opts.error);
      const response = await startRegistration(opts.options);
      const result = await addPasskeyVerify(response);
      if (!result.ok) throw new Error(result.error);
      setNote("Key added. The register has been amended.");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setNote(/NotAllowedError|abort|not allowed/i.test(msg) ? "Ceremony cancelled." : msg);
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="me-section">
      <h2 className="me-h">{"// keys to the tent"}</h2>
      {keys.length === 0 ? (
        <p className="me-keys-warning">
          ⚠ No passkey on this account. You are here on borrowed credentials (the Discord
          bridge). Add a key now — the bridge will not stand forever.
        </p>
      ) : (
        <ul className="me-keys">
          {keys.map((k) => (
            <li key={k.id}>
              <span className="me-key-glyph" aria-hidden>⚿</span>
              <span className="me-key-label">{k.label ?? "unnamed key"}</span>
              <span className="me-key-meta">
                {k.deviceType === "multiDevice" ? "synced" : "device-bound"} · minted {k.createdAt.slice(0, 10)}
                {k.lastUsedAt ? ` · last turned ${k.lastUsedAt.slice(0, 10)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="me-keys-actions">
        <button type="button" className="btn" onClick={() => void addKey()} disabled={busy}>
          {busy ? "Minting" : "⚿ Add a passkey"}
        </button>
        <button type="button" className="btn ghost" onClick={() => void leave()}>
          Leave the tent
        </button>
      </div>
      {note && <p className="me-keys-note">{note}</p>}
    </div>
  );
}
