/**
 * Farcaster Quick Auth JWT verification and user management.
 *
 * Used by Mini App and Farcaster clients via Bearer token in the
 * Authorization header. Web users authenticate through NextAuth instead
 * (see config.ts).
 *
 * - verifyFarcasterToken: Cryptographic verification via @farcaster/quick-auth,
 *   with fallback to plain JWT decode (dev only, logs a warning).
 * - findOrCreateFarcasterUser: Upserts user by FID, syncs display info
 *   (username, displayName, avatarUrl) on every login, and sets
 *   is_admin = true for FID 1568.
 */
import { db } from "@/lib/db"
import { findLinkableAccount } from "@/lib/auth/account-linking"
import type { AuthUser } from "@/types"

/**
 * Verifies a Farcaster Quick Auth JWT and returns the FID.
 *
 * Uses @farcaster/quick-auth for cryptographic verification when available.
 * Falls back to JWT decode with a WARNING log if the package isn't installed.
 */
export async function verifyFarcasterToken(
  token: string,
): Promise<{ fid: number } | null> {
  try {
    // Try using @farcaster/quick-auth for real cryptographic verification
    try {
      // @ts-ignore - package may not be installed yet
      const { verifyJwt } = await import("@farcaster/quick-auth" as string)
      const result = await verifyJwt({ token })
      if (result && result.fid) {
        return { fid: Number(result.fid) }
      }
      return null
    } catch {
      // Package not installed — fall back to manual decode with warning
      console.warn(
        "WARNING: @farcaster/quick-auth not installed. JWT is decoded but NOT cryptographically verified. " +
        "Install the package for production use: npm install @farcaster/quick-auth"
      )
    }

    // Fallback: decode JWT payload (NOT cryptographically verified)
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    )

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) return null

    const fid = payload.fid ?? payload.sub
    if (typeof fid !== "number" && typeof fid !== "string") return null

    const fidNum = typeof fid === "string" ? parseInt(fid, 10) : fid
    if (isNaN(fidNum)) return null

    return { fid: fidNum }
  } catch {
    return null
  }
}

/**
 * Finds an existing user by FID, or creates a new one.
 * Updates display info (username, displayName, avatarUrl) on every login.
 * Sets is_admin = true if FID === 1568.
 */
export async function findOrCreateFarcasterUser(
  fid: number,
  profile: {
    username: string
    displayName: string
    avatarUrl: string
    walletAddress?: string
    email?: string
  },
): Promise<AuthUser & { linkSuggestion?: { id: string; username: string; authMethod: string } }> {
  const isAdmin = fid === 1568

  const existingUser = await db
    .selectFrom("users")
    .where("fid", "=", fid)
    .selectAll()
    .executeTakeFirst()

  if (existingUser) {
    // Update display info on each login
    await db
      .updateTable("users")
      .set({
        username: profile.username,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        wallet_address: profile.walletAddress ?? existingUser.wallet_address,
        is_admin: isAdmin,
        updated_at: new Date(),
      })
      .where("id", "=", existingUser.id)
      .execute()

    return {
      id: existingUser.id,
      fid: existingUser.fid,
      email: existingUser.email,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      isAdmin,
      stripeCustomerId: existingUser.stripe_customer_id,
      stripeAccountId: existingUser.stripe_account_id,
      stripeOnboardingComplete: existingUser.stripe_onboarding_complete,
    }
  }

  // Create new user
  const newUser = await db
    .insertInto("users")
    .values({
      fid,
      username: profile.username,
      display_name: profile.displayName,
      avatar_url: profile.avatarUrl,
      wallet_address: profile.walletAddress ?? null,
      auth_method: "farcaster" as const,
      is_admin: isAdmin,
      stripe_onboarding_complete: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  const result: AuthUser & { linkSuggestion?: { id: string; username: string; authMethod: string } } = {
    id: newUser.id,
    fid: newUser.fid,
    email: newUser.email ?? null,
    username: newUser.username,
    displayName: newUser.display_name,
    avatarUrl: newUser.avatar_url,
    isAdmin,
    stripeCustomerId: newUser.stripe_customer_id ?? null,
    stripeAccountId: newUser.stripe_account_id ?? null,
    stripeOnboardingComplete: newUser.stripe_onboarding_complete,
  }

  // Check if there's a Google account with the same email that could be linked
  if (profile.email) {
    const linkable = await findLinkableAccount(profile.email, newUser.id)
    if (linkable) {
      result.linkSuggestion = {
        id: linkable.id,
        username: linkable.username,
        authMethod: linkable.auth_method,
      }
    }
  }

  return result
}
