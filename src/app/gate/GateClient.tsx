"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import {
  loginOptions,
  loginVerify,
  registerOptions,
  registerVerify,
} from "@/app/actions/passkey";

export default function GateClient({ next, bridgeError }: { next: string; bridgeError: boolean }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState<"login" | "register" | null>(null);
  const [error, setError] = useState<string | null>(
    bridgeError ? "The bridge doesn't know that Discord account. The register is below." : null,
  );

  async function present() {
    if (busy) return;
    setBusy("login");
    setError(null);
    try {
      const opts = await loginOptions();
      if (!opts.ok) throw new Error(opts.error);
      const response = await startAuthentication(opts.options);
      const result = await loginVerify(response);
      if (!result.ok) throw new Error(result.error);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(humanize(err));
    } finally {
      setBusy(null);
    }
  }

  async function sign() {
    if (busy) return;
    setBusy("register");
    setError(null);
    try {
      const opts = await registerOptions(handle);
      if (!opts.ok) throw new Error(opts.error);
      const response = await startRegistration(opts.options);
      const result = await registerVerify(handle, response);
      if (!result.ok) throw new Error(result.error);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(humanize(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="gate">
      <div className="gate-panel">
        <h2 className="gate-h">Returning?</h2>
        <p className="gate-sub">your device remembers, even if you don&apos;t.</p>
        <button type="button" className="btn" onClick={() => void present()} disabled={busy !== null}>
          {busy === "login" ? "Checking the key" : "◆ Present your key"}
        </button>
      </div>

      <div className="gate-panel">
        <h2 className="gate-h">New blood?</h2>
        <p className="gate-sub">pick a handle. the register is permanent. choose accordingly.</p>
        <div className="gate-row">
          <span className="gate-at" aria-hidden>@</span>
          <input
            className="rooms-input gate-input"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void sign()}
            placeholder="handle"
            maxLength={32}
            autoComplete="username"
            spellCheck={false}
            aria-label="Handle"
          />
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => void sign()}
          disabled={busy !== null || handle.trim().length < 2}
        >
          {busy === "register" ? "Minting the key" : "◇ Sign the register"}
        </button>
      </div>

      {error && <p className="gate-error" role="alert">{error}</p>}
    </div>
  );
}

function humanize(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/NotAllowedError|timed out|not allowed|abort/i.test(msg)) {
    return "The ceremony was cancelled. The house pretends not to notice.";
  }
  if (/InvalidStateError/i.test(msg)) {
    return "This device already holds a key for that. Present it instead.";
  }
  return msg;
}
