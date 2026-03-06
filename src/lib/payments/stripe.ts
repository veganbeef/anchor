/**
 * Stripe client and checkout session helpers.
 *
 * Supports three payment types:
 * - Platform subscription ($10/mo/feed)
 * - User-to-user subscription (via Connect)
 * - Per-video purchase (one-time via Connect)
 *
 * API version pinned to 2025-01-27.acacia.
 */
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
})

/**
 * Creates a Stripe Checkout session for subscription or one-time payment.
 * For user-to-user payments, uses application_fee_percent (subscriptions)
 * or application_fee_amount (one-time) with transfer_data to route funds
 * to the creator's Connect account.
 */
export async function createCheckoutSession(params: {
  priceUsd: number
  mode: "subscription" | "payment"
  customerId: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
  connectedAccountId?: string
  applicationFeePercent?: number
}): Promise<string> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: params.customerId,
    mode: params.mode,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(params.priceUsd * 100),
          product_data: { name: params.metadata?.product_name || "Anchor Subscription" },
          ...(params.mode === "subscription" ? { recurring: { interval: "month" } } : {}),
        },
        quantity: 1,
      },
    ],
    payment_method_types: ["card"],
  }

  if (params.connectedAccountId && params.applicationFeePercent) {
    if (params.mode === "subscription") {
      // For subscriptions, use subscription_data with application_fee_percent
      sessionParams.subscription_data = {
        application_fee_percent: params.applicationFeePercent,
        transfer_data: { destination: params.connectedAccountId },
      } as any
    } else {
      // For one-time payments, use payment_intent_data with application_fee_amount
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(params.priceUsd * 100 * (params.applicationFeePercent / 100)),
        transfer_data: { destination: params.connectedAccountId },
      }
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams)
  return session.url!
}

/**
 * Race-safe Stripe customer creation. Uses a conditional UPDATE (WHERE stripe_customer_id IS NULL)
 * to prevent duplicate customers when concurrent requests hit this path.
 */
export async function getOrCreateCustomer(userId: string, email: string | null): Promise<string> {
  const { db } = await import("@/lib/db")

  // Use a simple check-then-create with the existing stripe_customer_id
  const user = await db.selectFrom("users").where("id", "=", userId).select(["stripe_customer_id", "email"]).executeTakeFirst()

  if (user?.stripe_customer_id) return user.stripe_customer_id

  const customer = await stripe.customers.create({
    email: email || user?.email || undefined,
    metadata: { anchor_user_id: userId },
  })

  // Use a conditional update to avoid race conditions — only set if still null
  const result = await db.updateTable("users")
    .set({ stripe_customer_id: customer.id })
    .where("id", "=", userId)
    .where("stripe_customer_id", "is", null)
    .executeTakeFirst()

  if (Number(result.numUpdatedRows) === 0) {
    // Another request already set the customer ID — use that one and clean up
    const updated = await db.selectFrom("users").where("id", "=", userId).select(["stripe_customer_id"]).executeTakeFirstOrThrow()
    // Delete the orphaned customer we just created
    try { await stripe.customers.del(customer.id) } catch { /* best effort */ }
    return updated.stripe_customer_id!
  }

  return customer.id
}
