import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/db";

/**
 * Our own sessions — the Auth.js replacement. Opaque random token in an
 * httpOnly cookie, row in the existing sessions table, user hydrated on
 * every read. Sliding expiry: reads refresh the row when it's past half-life.
 */

const { sessions, users } = schema;

export const SESSION_COOKIE = "degenff_session";
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;

export type Role = "visitor" | "contributor" | "mod" | "admin";

export type SessionUser = {
  id: string;
  role: Role;
  handle: string;
  name: string | null;
  image: string | null;
  discordId: string | null;
};

export type Session = { user: SessionUser };

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

/** Create a session row + set the cookie. Call from Server Actions or
 * Route Handlers only (cookie writes are illegal in RSC). */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ sessionToken: token, userId, expires });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expires));
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.sessionToken, token)).catch(() => {});
  }
  jar.delete(SESSION_COOKIE);
}

/** Token → session, shared by auth() and the proxy. */
export async function getSessionByToken(token: string): Promise<Session | null> {
  if (!token) return null;
  const row = await db.query.sessions.findFirst({
    where: eq(sessions.sessionToken, token),
  });
  if (!row || row.expires <= new Date()) return null;

  const u = await db.query.users.findFirst({ where: eq(users.id, row.userId) });
  if (!u) return null;

  // Sliding expiry — refresh once past half-life; best-effort.
  if (row.expires.getTime() - Date.now() < SESSION_TTL_MS / 2) {
    db.update(sessions)
      .set({ expires: new Date(Date.now() + SESSION_TTL_MS) })
      .where(eq(sessions.sessionToken, token))
      .catch(() => {});
  }

  return {
    user: {
      id: u.id,
      role: u.role,
      handle: u.handle,
      name: u.name,
      image: u.image,
      discordId: u.discordId,
    },
  };
}

/** Drop-in for the old Auth.js auth(): current session or null. */
export async function auth(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionByToken(token);
}
