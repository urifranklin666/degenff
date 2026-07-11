import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { createSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The claim bridge, callback side. Lives at the old Auth.js callback path on
 * purpose — it's the redirect URI already registered on the Discord app.
 * Exchanges the code, reads the Discord user id, and signs in the matching
 * pre-existing account. Unknown Discord ids get sent to the register instead;
 * the bridge does not mint accounts.
 */

const { users } = schema;
const STATE_COOKIE = "degenff_bridge";

function sign(payload: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(payload).digest("base64url");
}

export async function GET(req: NextRequest) {
  const site = process.env.AUTH_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
  const fail = (reason: string) =>
    NextResponse.redirect(`${site}/gate?bridge=unknown&why=${reason}`);

  const jar = await cookies();
  const stateRaw = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || !stateRaw) return fail("state");

  const [nonce, next, sig] = stateRaw.split("|");
  const expected = sign(`${nonce}|${next}`);
  const a = Buffer.from(sig ?? "");
  const b = Buffer.from(expected);
  if (nonce !== state || a.length !== b.length || !timingSafeEqual(a, b)) return fail("state");

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("config");

  let discordId: string;
  try {
    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${site}/api/auth/callback/discord`,
      }),
    });
    if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const meRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!meRes.ok) throw new Error(`me ${meRes.status}`);
    discordId = ((await meRes.json()) as { id: string }).id;
  } catch (err) {
    console.error("[bridge] discord exchange failed:", err);
    return fail("exchange");
  }

  const user = await db.query.users.findFirst({ where: eq(users.discordId, discordId) });
  if (!user) return fail("noaccount");

  await createSession(user.id);
  const dest = next?.startsWith("/") && !next.startsWith("//") ? next : "/me";
  return NextResponse.redirect(`${site}${dest}`);
}
