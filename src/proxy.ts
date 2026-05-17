import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Next.js 16 renames middleware → proxy. Guards /mod.
 * - Unsigned-in visitors are sent to the signin flow with a callback to /mod.
 * - Signed-in visitors without mod/admin are bounced to /?forbidden=1
 *   (NOT back to signin — that would loop, because Auth.js will redirect
 *   already-signed-in users to the callbackUrl, which puts us right back here).
 */
export default auth((req) => {
  const url = req.nextUrl;

  if (url.pathname.startsWith("/mod")) {
    if (!req.auth) {
      const signIn = new URL("/api/auth/signin", url);
      signIn.searchParams.set("callbackUrl", url.pathname + url.search);
      return NextResponse.redirect(signIn);
    }
    const role = req.auth.user?.role;
    if (role !== "mod" && role !== "admin") {
      return NextResponse.redirect(new URL("/?forbidden=1", url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/|_static/|favicon\\.ico|mark\\.svg|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff2?|ttf)|api/auth/).*)",
  ],
};
