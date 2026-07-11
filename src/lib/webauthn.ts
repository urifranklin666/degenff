import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * WebAuthn plumbing shared by the gate ceremonies. The relying party is
 * derived from AUTH_URL; the pending challenge rides in a short-lived
 * HMAC-signed cookie so no server-side challenge store is needed (the web
 * app is one process, but cookies survive redeploys mid-ceremony too).
 */

const CHALLENGE_COOKIE = "degenff_chal";
const CHALLENGE_TTL_S = 300;

function siteUrl(): URL {
  return new URL(process.env.AUTH_URL ?? "http://localhost:3000");
}

/** WebAuthn RP ID — the registrable domain. Passkeys mint against this;
 * changing it orphans every credential. */
export function rpID(): string {
  return siteUrl().hostname;
}

export function rpOrigin(): string {
  return siteUrl().origin;
}

export const RP_NAME = "degeneratefuckface.com";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET not set — cannot sign WebAuthn challenges.");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export type ChallengePurpose = "register" | "login" | "add";

/** Stash the ceremony's challenge in a signed cookie. Server Actions only. */
export async function stashChallenge(purpose: ChallengePurpose, challenge: string): Promise<void> {
  const payload = `${purpose}.${challenge}.${Date.now() + CHALLENGE_TTL_S * 1000}`;
  (await cookies()).set(CHALLENGE_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_TTL_S,
  });
}

/** Pop and verify the pending challenge. Single-use: the cookie is cleared. */
export async function takeChallenge(purpose: ChallengePurpose): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete(CHALLENGE_COOKIE);
  if (!raw) return null;

  const lastDot = raw.lastIndexOf(".");
  if (lastDot < 0) return null;
  const payload = raw.slice(0, lastDot);
  const sig = raw.slice(lastDot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [p, challenge, expiresAt] = payload.split(".");
  if (p !== purpose) return null;
  if (!expiresAt || Number(expiresAt) < Date.now()) return null;
  return challenge || null;
}
