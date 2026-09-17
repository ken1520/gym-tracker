import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/server/auth/token";

// The outer gate, and deliberately the cheap one. Proxy runs on every request
// including prefetches, so it only checks the signature on the cookie and never
// touches the database — the real checks live next to the data, in the DAL and
// in each action.
//
// Note this is proxy.ts, not middleware.ts: the file convention was renamed in
// Next.js 16 and the old name is deprecated

// Reachable signed out. Everything else redirects to /login
const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isPublic) {
    const target = new URL("/login", request.nextUrl);
    // Come back to where they were headed once they sign in
    target.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(target);
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // API routes are excluded so an unauthenticated call gets a 401 envelope
  // rather than a 307 to an HTML login page, which no client can parse
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"],
};
