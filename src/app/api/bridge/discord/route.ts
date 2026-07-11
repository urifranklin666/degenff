import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The claim bridge, entry side. One last Discord sign-in for pre-passkey
 * accounts: we send the visitor to Discord's authorize page and the callback
 * (kept at the old Auth.js path so the Discord app's registered redirect URI
 * still matches) turns a known discord_id into a session. No new accounts.
 */

const STATE_COOKIE = "degenff_bridge";

function sign(payload: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(payload).digest("base64url");
}

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const site = process.env.AUTH_URL?.replace(/\/$/, "");
  if (!clientId || !site) {
    return new Response("bridge unconfigured", { status: 503 });
  }

  const rawNext = req.nextUrl.searchParams.get("next") ?? "/me";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/me";
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${nonce}|${next}`;

  (await cookies()).set(STATE_COOKIE, `${payload}|${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${site}/api/auth/callback/discord`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", nonce);
  url.searchParams.set("prompt", "none");

  return NextResponse.redirect(url);
}
