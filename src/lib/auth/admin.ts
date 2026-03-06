/**
 * Admin guard backed by the is_admin database column (not a hardcoded FID check).
 *
 * Additional admins can be granted access via a database update without any
 * code changes. Used by all /admin/* routes and (admin) server pages.
 *
 * Throws AuthError with appropriate HTTP status codes:
 *   - 401 for unauthenticated requests
 *   - 403 for authenticated but non-admin users
 */
import type { AuthUser } from "@/types"

export function requireAdmin(
  user: AuthUser | null,
): asserts user is AuthUser & { isAdmin: true } {
  if (!user) {
    throw new AuthError("Authentication required", 401)
  }
  if (!user.isAdmin) {
    throw new AuthError("Admin access required", 403)
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = "AuthError"
  }
}
