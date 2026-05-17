import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Next.js 16 renames middleware → proxy. This guards /mod for signed-in
 * mods/admins only; everything else is public. Public routes still see
 * the session if there is one.
 */
export default auth((req) => {
  const url = req.nextUrl;

  if (url.pathname.startsWith("/mod")) {
    const role = req.auth?.user?.role;
    if (!req.auth || (role !== "mod" && role !== "admin")) {
      const signIn = new URL("/api/auth/signin", url);
      signIn.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(signIn);
    }
  }

  return NextResponse.next();
});

// Skip _next, static, and the auth API itself.
export const config = {
  matcher: [
    "/((?!_next/|_static/|favicon\\.ico|mark\\.svg|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff2?|ttf)|api/auth/).*)",
  ],
};
