"use server";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { db, schema } from "@/db";
import { auth, createSession, destroySession } from "@/lib/session";
import { consumeRateLimit, formatRetryAfter } from "@/lib/ratelimit";
import { RP_NAME, rpID, rpOrigin, stashChallenge, takeChallenge } from "@/lib/webauthn";

const { users, passkeys } = schema;

const HANDLE_RE = /^[a-z0-9][a-z0-9_.-]{1,31}$/i;
const RESERVED_HANDLES = new Set([
  "anon", "admin", "mod", "ops", "system", "root",
  "barker", "the-barker", "clerk", "spirit", "the-house",
]);

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

type OptionsResult<T> = { ok: true; options: T } | { ok: false; error: string };
export type CeremonyResult = { ok: true; handle: string } | { ok: false; error: string };

/* ── sign the register (new account) ─────────────────────────────────── */

export async function registerOptions(
  rawHandle: string,
): Promise<OptionsResult<PublicKeyCredentialCreationOptionsJSON>> {
  const handle = String(rawHandle ?? "").trim().toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    return { ok: false, error: "Handles: 2–32 chars, letters/digits/._- , starts alphanumeric." };
  }
  if (RESERVED_HANDLES.has(handle)) {
    return { ok: false, error: "That name is house property." };
  }
  const taken = await db.query.users.findFirst({ where: eq(users.handle, handle) });
  if (taken) {
    return { ok: false, error: "That handle is already on the register." };
  }

  const rl = await consumeRateLimit({
    key: `register:${await clientIp()}`,
    max: 5,
    windowMs: 3600_000,
  });
  if (!rl.ok) {
    return { ok: false, error: `The register is closed to your address for ${formatRetryAfter(rl.retryAfterSec)}.` };
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpID(),
    userID: nanoid(21), // opaque; our users.id is minted at verify time
    userName: handle,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required", // discoverable — the gate signs in without a handle
      userVerification: "preferred",
    },
  });
  await stashChallenge("register", options.challenge);
  return { ok: true, options };
}

export async function registerVerify(
  rawHandle: string,
  response: RegistrationResponseJSON,
): Promise<CeremonyResult> {
  const handle = String(rawHandle ?? "").trim().toLowerCase();
  const challenge = await takeChallenge("register");
  if (!challenge) return { ok: false, error: "The ceremony expired. Start again." };
  if (!HANDLE_RE.test(handle) || RESERVED_HANDLES.has(handle)) {
    return { ok: false, error: "Bad handle." };
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rpOrigin(),
      expectedRPID: rpID(),
      requireUserVerification: false,
    });
  } catch (err) {
    console.error("[gate] registration verify failed:", err);
    return { ok: false, error: "The authenticator's answer didn't hold up." };
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "The authenticator's answer didn't hold up." };
  }

  // Re-check the handle — someone may have taken it mid-ceremony.
  const taken = await db.query.users.findFirst({ where: eq(users.handle, handle) });
  if (taken) return { ok: false, error: "That handle got claimed while you fumbled with the key." };

  const info = verification.registrationInfo;
  const [user] = await db
    .insert(users)
    .values({ handle, name: handle })
    .returning();
  await db.insert(passkeys).values({
    id: isoBase64URL.fromBuffer(info.credentialID),
    userId: user.id,
    publicKey: isoBase64URL.fromBuffer(info.credentialPublicKey),
    counter: info.counter,
    transports: response.response.transports ?? [],
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    label: "first key",
  });

  await createSession(user.id);
  return { ok: true, handle };
}

/* ── present a passkey (login) ───────────────────────────────────────── */

export async function loginOptions(): Promise<
  OptionsResult<PublicKeyCredentialRequestOptionsJSON>
> {
  const rl = await consumeRateLimit({
    key: `login:${await clientIp()}`,
    max: 30,
    windowMs: 3600_000,
  });
  if (!rl.ok) {
    return { ok: false, error: `Too many attempts. Wait ${formatRetryAfter(rl.retryAfterSec)}.` };
  }
  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "preferred",
    // no allowCredentials — discoverable credentials pick the account
  });
  await stashChallenge("login", options.challenge);
  return { ok: true, options };
}

export async function loginVerify(response: AuthenticationResponseJSON): Promise<CeremonyResult> {
  const challenge = await takeChallenge("login");
  if (!challenge) return { ok: false, error: "The ceremony expired. Start again." };

  const pk = await db.query.passkeys.findFirst({ where: eq(passkeys.id, response.id) });
  if (!pk) return { ok: false, error: "The house doesn't know that key." };

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rpOrigin(),
      expectedRPID: rpID(),
      authenticator: {
        credentialID: isoBase64URL.toBuffer(pk.id),
        credentialPublicKey: isoBase64URL.toBuffer(pk.publicKey),
        counter: pk.counter,
      },
      requireUserVerification: false,
    });
  } catch (err) {
    console.error("[gate] login verify failed:", err);
    return { ok: false, error: "The key didn't turn." };
  }
  if (!verification.verified) return { ok: false, error: "The key didn't turn." };

  const user = await db.query.users.findFirst({ where: eq(users.id, pk.userId) });
  if (!user) return { ok: false, error: "That key opens a door that no longer exists." };

  await db
    .update(passkeys)
    .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() })
    .where(eq(passkeys.id, pk.id));

  await createSession(user.id);
  return { ok: true, handle: user.handle };
}

/* ── add a key to a signed-in account (incl. bridge claimants) ───────── */

export async function addPasskeyOptions(): Promise<
  OptionsResult<PublicKeyCredentialCreationOptionsJSON>
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in first." };

  const existing = await db.query.passkeys.findMany({
    where: eq(passkeys.userId, session.user.id),
  });
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpID(),
    userID: session.user.id,
    userName: session.user.handle,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: isoBase64URL.toBuffer(c.id),
      type: "public-key",
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });
  await stashChallenge("add", options.challenge);
  return { ok: true, options };
}

export async function addPasskeyVerify(response: RegistrationResponseJSON): Promise<CeremonyResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in first." };
  const challenge = await takeChallenge("add");
  if (!challenge) return { ok: false, error: "The ceremony expired. Start again." };

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rpOrigin(),
      expectedRPID: rpID(),
      requireUserVerification: false,
    });
  } catch (err) {
    console.error("[gate] add-passkey verify failed:", err);
    return { ok: false, error: "The authenticator's answer didn't hold up." };
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "The authenticator's answer didn't hold up." };
  }

  const info = verification.registrationInfo;
  await db.insert(passkeys).values({
    id: isoBase64URL.fromBuffer(info.credentialID),
    userId: session.user.id,
    publicKey: isoBase64URL.fromBuffer(info.credentialPublicKey),
    counter: info.counter,
    transports: response.response.transports ?? [],
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    label: `key ${new Date().toISOString().slice(0, 10)}`,
  });
  return { ok: true, handle: session.user.handle };
}

/* ── leave ───────────────────────────────────────────────────────────── */

export async function logout(): Promise<void> {
  await destroySession();
}
