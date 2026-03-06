/**
 * Next.js edge middleware — fast pre-check for admin routes.
 *
 * Only checks for presence of auth cookie or Bearer token (not validity — full
 * auth happens in API routes). Redirects unauthenticated requests to /admin/*
 * back to homepage.
 *
 * Matched only on /admin/:path* for minimal middleware overhead.
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Admin routes require authentication (checked server-side via getAuthUser)
  // This middleware provides early redirect for unauthenticated requests
  // The actual admin guard (is_admin check) happens in the API routes

  // For admin pages, check for auth cookie presence as a fast pre-check
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const hasNextAuthSession = request.cookies.has("next-auth.session-token") ||
      request.cookies.has("__Secure-next-auth.session-token")
    const hasBearerToken = request.headers.get("authorization")?.startsWith("Bearer ")

    if (!hasNextAuthSession && !hasBearerToken) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
