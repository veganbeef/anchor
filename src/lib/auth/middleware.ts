/**
 * Unified auth middleware -- single entry point for both API routes
 * (getAuthUser) and server components (getServerUser).
 *
 * Auth cascade:
 *   1. Bearer token -> Farcaster Quick Auth JWT -> look up user by FID
 *   2. NextAuth session cookie -> look up user by session ID
 *   3. Neither present -> returns null (guest / unauthenticated)
 *
 * All API routes call getAuthUser(request) to obtain the authenticated
 * user or null. Server components use getServerUser() which only checks
 * the NextAuth cookie (no access to the Request object).
 */
import { auth } from "@/lib/auth/config"
import { verifyFarcasterToken } from "@/lib/auth/farcaster"
import { db } from "@/lib/db"
import { mapDbUserToAuthUser } from "./mapper"
import type { AuthUser } from "@/types"

/**
 * Returns the authenticated user or null for guests.
 * For use in API routes (has access to the Request object).
 *
 * Checks authentication in order:
 * 1. Bearer token (Farcaster Quick Auth)
 * 2. NextAuth session (cookie-based, Google / Email)
 */
export async function getAuthUser(
  request: Request,
): Promise<AuthUser | null> {
  // 1. Check Bearer token (Farcaster Quick Auth)
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const result = await verifyFarcasterToken(token)
    if (result) {
      const user = await db
        .selectFrom("users")
        .where("fid", "=", result.fid)
        .selectAll()
        .executeTakeFirst()
      if (user) return mapDbUserToAuthUser(user)
    }
  }

  // 2. Check NextAuth session (cookie-based)
  const session = await auth()
  if (session?.user?.id) {
    const user = await db
      .selectFrom("users")
      .where("id", "=", session.user.id)
      .selectAll()
      .executeTakeFirst()
    if (user) return mapDbUserToAuthUser(user)
  }

  return null
}

/**
 * Returns the authenticated user for server components (no Request object).
 * Only checks NextAuth session (cookie-based).
 * Farcaster users must use client components that call API routes with Bearer tokens.
 */
export async function getServerUser(): Promise<AuthUser | null> {
  const session = await auth()
  if (session?.user?.id) {
    const user = await db
      .selectFrom("users")
      .where("id", "=", session.user.id)
      .selectAll()
      .executeTakeFirst()
    if (user) return mapDbUserToAuthUser(user)
  }
  return null
}

export { mapDbUserToAuthUser }
