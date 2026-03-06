import type { AuthUser } from "@/types"

export function mapDbUserToAuthUser(user: any): AuthUser {
  return {
    id: user.id,
    fid: user.fid,
    email: user.email,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    isAdmin: user.is_admin,
    stripeCustomerId: user.stripe_customer_id,
    stripeAccountId: user.stripe_account_id,
    stripeOnboardingComplete: user.stripe_onboarding_complete,
  }
}
