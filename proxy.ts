import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

// Prefixes that require *some* signed-in session. Role-specific gating
// (volunteer vs admin) happens in each route's server component via
// requireRole()/getCurrentUser(), since that needs a real DB-backed session
// lookup — middleware only gets the cheap "is there a session cookie" check.
const PROTECTED_PREFIXES = ["/dashboard", "/volunteer", "/admin", "/account"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (!needsAuth) return NextResponse.next()

  const sessionCookie = getSessionCookie(request)
  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/volunteer/:path*", "/admin/:path*", "/account/:path*"],
}
