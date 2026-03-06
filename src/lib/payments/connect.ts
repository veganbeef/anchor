/**
 * Stripe Connect Express account management for creators.
 *
 * Creators must complete Connect onboarding before setting prices on their feeds.
 * Platform takes 5% application fee on all user-to-user transactions.
 */
import { stripe } from "./stripe"
import { db } from "@/lib/db"

/** Creates an Express account with card_payments + transfers capabilities, returns onboarding link. */
export async function createConnectAccount(userId: string, email: string | null): Promise<string> {
  const user = await db.selectFrom("users").where("id", "=", userId).select(["stripe_account_id"]).executeTakeFirst()

  if (user?.stripe_account_id) {
    // Return account link for existing account
    return createAccountLink(user.stripe_account_id)
  }

  const account = await stripe.accounts.create({
    type: "express",
    email: email || undefined,
    metadata: { anchor_user_id: userId },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })

  await db
    .updateTable("users")
    .set({ stripe_account_id: account.id })
    .where("id", "=", userId)
    .execute()

  return createAccountLink(account.id)
}

async function createAccountLink(accountId: string): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/stripe/connect`,
    return_url: `${baseUrl}/stripe/return`,
    type: "account_onboarding",
  })
  return accountLink.url
}

/** Checks onboarding completion via Stripe API; caches result in users.stripe_onboarding_complete. */
export async function checkAccountStatus(userId: string): Promise<{ complete: boolean; accountId: string | null }> {
  const user = await db.selectFrom("users").where("id", "=", userId).select(["stripe_account_id", "stripe_onboarding_complete"]).executeTakeFirst()

  if (!user?.stripe_account_id) return { complete: false, accountId: null }
  if (user.stripe_onboarding_complete) return { complete: true, accountId: user.stripe_account_id }

  const account = await stripe.accounts.retrieve(user.stripe_account_id)
  const complete = account.details_submitted ?? false

  if (complete && !user.stripe_onboarding_complete) {
    await db.updateTable("users").set({ stripe_onboarding_complete: true }).where("id", "=", userId).execute()
  }

  return { complete, accountId: user.stripe_account_id }
}
