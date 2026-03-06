/**
 * Admin-initiated refund flow: Stripe refund -> payment ledger update -> access revocation.
 *
 * Handles all three payment types:
 * - video_purchase: deletes the video_purchases row
 * - user_subscription: cancels Stripe subscription + updates status
 * - platform_subscription: cancels Stripe subscription + updates status
 *
 * Idempotent: rejects already-refunded payments.
 */
import { stripe } from "./stripe"
import { db } from "@/lib/db"

export async function refundPayment(paymentId: string, reason: string): Promise<void> {
  const payment = await db
    .selectFrom("payments")
    .where("id", "=", paymentId)
    .selectAll()
    .executeTakeFirstOrThrow()

  if (payment.status === "refunded") {
    throw new Error("Payment already refunded")
  }

  // Refund via Stripe
  if (payment.stripe_payment_intent_id) {
    await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
    })
  }

  // Update payment ledger
  await db
    .updateTable("payments")
    .set({
      status: "refunded",
      refunded_at: new Date(),
      refund_reason: reason,
    })
    .where("id", "=", paymentId)
    .execute()

  // Revoke video access if video purchase
  if (payment.type === "video_purchase" && payment.video_id) {
    await db
      .deleteFrom("video_purchases")
      .where("user_id", "=", payment.payer_id)
      .where("video_id", "=", payment.video_id)
      .execute()
  }

  // Cancel subscription if subscription payment
  if (payment.type === "user_subscription" && payment.feed_id) {
    const sub = await db
      .selectFrom("user_subscriptions")
      .where("subscriber_id", "=", payment.payer_id)
      .where("feed_id", "=", payment.feed_id)
      .where("status", "=", "active")
      .select(["id", "stripe_subscription_id"])
      .executeTakeFirst()

    if (sub && sub.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id)
      } catch (error) {
        console.error("Failed to cancel Stripe subscription:", error)
      }
      await db
        .updateTable("user_subscriptions")
        .set({ status: "cancelled", updated_at: new Date() })
        .where("id", "=", sub.id)
        .execute()
    }
  }

  // Cancel platform subscription if platform payment
  if (payment.type === "platform_subscription" && payment.feed_id) {
    const sub = await db
      .selectFrom("platform_subscriptions")
      .where("user_id", "=", payment.payer_id)
      .where("feed_id", "=", payment.feed_id)
      .where("status", "=", "active")
      .select(["id", "stripe_subscription_id"])
      .executeTakeFirst()

    if (sub && sub.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id)
      } catch (error) {
        console.error("Failed to cancel Stripe subscription:", error)
      }
      await db
        .updateTable("platform_subscriptions")
        .set({ status: "cancelled", updated_at: new Date() })
        .where("id", "=", sub.id)
        .execute()
    }
  }
}
