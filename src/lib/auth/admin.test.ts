import { describe, it, expect } from "vitest"
import { requireAdmin, AuthError } from "./admin"
import type { AuthUser } from "@/types"

const mockAdmin: AuthUser = {
  id: "user-1",
  fid: 1568,
  email: null,
  username: "admin",
  displayName: "Admin",
  avatarUrl: null,
  isAdmin: true,
  stripeCustomerId: null,
  stripeAccountId: null,
  stripeOnboardingComplete: false,
}

const mockUser: AuthUser = {
  id: "user-2",
  fid: 999,
  email: "test@test.com",
  username: "testuser",
  displayName: "Test User",
  avatarUrl: null,
  isAdmin: false,
  stripeCustomerId: null,
  stripeAccountId: null,
  stripeOnboardingComplete: false,
}

describe("requireAdmin", () => {
  it("allows admin users", () => {
    expect(() => requireAdmin(mockAdmin)).not.toThrow()
  })

  it("rejects non-admin users with 403", () => {
    try {
      requireAdmin(mockUser)
      expect.fail("Should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError)
      expect((error as AuthError).statusCode).toBe(403)
    }
  })

  it("rejects null user with 401", () => {
    try {
      requireAdmin(null)
      expect.fail("Should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError)
      expect((error as AuthError).statusCode).toBe(401)
    }
  })

  it("uses is_admin flag not hardcoded FID", () => {
    // An admin with a different FID should still pass
    const otherAdmin: AuthUser = { ...mockUser, isAdmin: true, fid: 9999 }
    expect(() => requireAdmin(otherAdmin)).not.toThrow()

    // FID 1568 with isAdmin=false should fail
    const notAdmin: AuthUser = { ...mockAdmin, isAdmin: false }
    try {
      requireAdmin(notAdmin)
      expect.fail("Should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError)
      expect((error as AuthError).statusCode).toBe(403)
    }
  })
})
