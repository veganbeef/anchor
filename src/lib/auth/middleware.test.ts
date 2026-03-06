import { describe, it, expect } from "vitest"
import { mapDbUserToAuthUser } from "./mapper"

describe("mapDbUserToAuthUser", () => {
  it("maps database user to AuthUser", () => {
    const dbUser = {
      id: "uuid-1",
      fid: 1568,
      email: "test@test.com",
      username: "testuser",
      display_name: "Test User",
      avatar_url: "https://example.com/avatar.png",
      is_admin: true,
      stripe_customer_id: "cus_123",
      stripe_account_id: "acct_123",
      stripe_onboarding_complete: true,
    }

    const result = mapDbUserToAuthUser(dbUser)

    expect(result).toEqual({
      id: "uuid-1",
      fid: 1568,
      email: "test@test.com",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      isAdmin: true,
      stripeCustomerId: "cus_123",
      stripeAccountId: "acct_123",
      stripeOnboardingComplete: true,
    })
  })

  it("handles null values", () => {
    const dbUser = {
      id: "uuid-2",
      fid: null,
      email: null,
      username: "guest",
      display_name: "Guest",
      avatar_url: null,
      is_admin: false,
      stripe_customer_id: null,
      stripe_account_id: null,
      stripe_onboarding_complete: false,
    }

    const result = mapDbUserToAuthUser(dbUser)
    expect(result.fid).toBeNull()
    expect(result.email).toBeNull()
    expect(result.avatarUrl).toBeNull()
    expect(result.isAdmin).toBe(false)
  })
})
