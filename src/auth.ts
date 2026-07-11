/**
 * Auth façade. Auth.js is gone — sessions are ours (src/lib/session.ts),
 * sign-in is passkeys at /gate (src/app/actions/passkey.ts), and the only
 * Discord left is the one-way claim bridge (src/app/api/bridge/discord).
 * This module keeps the old import path so call sites read unchanged.
 */
export { auth } from "@/lib/session";
export type { Role, Session, SessionUser } from "@/lib/session";
