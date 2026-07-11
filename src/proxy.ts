import { NextResponse, type NextRequest } from "next/server";
import { getSessionByToken, SESSION_COOKIE } from "@/lib/session";

/**
 * Next.js 16 renames middleware → proxy; it runs on the Node runtime, so the
 * session lookup hits Postgres directly. Guards:
 * - /ops: mod/admin only. Signed-out → /gate; wrong role → /?forbidden=1
 *   (NOT back to the gate — a signed-in user would just loop).
 * - /rooms: any signed-in user.
 */
export default async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const needsOps = url.pathname.startsWith("/ops");
  const needsUser = url.pathname.startsWith("/rooms");
  if (!needsOps && !needsUser) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const session = token ? await getSessionByToken(token) : null;

  if (!session) {
    const gate = new URL("/gate", url);
    gate.searchParams.set("next", url.pathname + url.search);
    return NextResponse.redirect(gate);
  }
  if (needsOps && session.user.role !== "mod" && session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/?forbidden=1", url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/|_static/|favicon\\.ico|mark\\.svg|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff2?|ttf)|api/auth/).*)",
  ],
};
