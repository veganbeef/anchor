/**
 * Stripe webhook handler — processes all Stripe events for payments,
 * subscriptions, and Connect.
 *
 * Security: Stripe signature verification on every request; idempotency via
 * stripe_events table.
 *
 * Handled events:
 * - checkout.session.completed (3 sub-types: platform_subscription,
 *   user_subscription, video_purchase)
 * - invoice.paid (subscription renewal)
 * - customer.subscription.deleted
 * - invoice.payment_failed
 * - account.updated (Connect onboarding)
 *
 * Failed processing returns 500 (allows Stripe retry) without recording the event.
 */
import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/payments/stripe"
import { db } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 401 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // Idempotency check
  const existing = await db
    .selectFrom("stripe_events")
    .where("stripe_event_id", "=", event.id)
    .executeTakeFirst()
  if (existing) return NextResponse.json({ ok: true })

  // Process event — only record in stripe_events after successful processing
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any
        const metadata = session.metadata || {}

        if (metadata.type === "platform_subscription") {
          await db.insertInto("platform_subscriptions").values({
            id: uuidv4(),
            user_id: metadata.user_id,
            feed_id: metadata.feed_id,
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            status: "active",
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            price_usd: "10.00",
          }).execute()

          // Record payment ledger entry for platform subscription
          await db.insertInto("payments").values({
            id: uuidv4(),
            type: "platform_subscription",
            payer_id: metadata.user_id,
            recipient_id: null,
            feed_id: metadata.feed_id,
            video_id: null,
            amount_usd: "10.00",
            platform_fee_usd: "10.00",
            payment_method: "card",
            stripe_payment_intent_id: session.payment_intent,
            status: "completed",
          }).execute()
        } else if (metadata.type === "user_subscription") {
          const amountUsd = String(session.amount_total / 100)
          const feeUsd = String((session.amount_total / 100) * 0.05)

          await db.insertInto("user_subscriptions").values({
            id: uuidv4(),
            subscriber_id: metadata.subscriber_id,
            creator_id: metadata.creator_id,
            feed_id: metadata.feed_id,
            stripe_subscription_id: session.subscription,
            status: "active",
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            price_usd: amountUsd,
          }).execute()

          // Record payment ledger entry for user subscription
          await db.insertInto("payments").values({
            id: uuidv4(),
            type: "user_subscription",
            payer_id: metadata.subscriber_id,
            recipient_id: metadata.creator_id,
            feed_id: metadata.feed_id,
            video_id: null,
            amount_usd: amountUsd,
            platform_fee_usd: feeUsd,
            payment_method: "card",
            stripe_payment_intent_id: session.payment_intent,
            status: "completed",
          }).execute()
        } else if (metadata.type === "video_purchase") {
          const paymentId = uuidv4()
          await db.insertInto("payments").values({
            id: paymentId,
            type: "video_purchase",
            payer_id: metadata.buyer_id,
            recipient_id: metadata.creator_id,
            feed_id: metadata.feed_id,
            video_id: metadata.video_id,
            amount_usd: String(session.amount_total / 100),
            platform_fee_usd: String((session.amount_total / 100) * 0.05),
            payment_method: "card",
            stripe_payment_intent_id: session.payment_intent,
            status: "completed",
          }).execute()
          await db.insertInto("video_purchases").values({
            id: uuidv4(),
            user_id: metadata.buyer_id,
            video_id: metadata.video_id,
            payment_id: paymentId,
          }).execute()
        }
        break
      }
      case "invoice.paid": {
        // Renew subscription periods
        const invoice = event.data.object as any
        const subscriptionId = invoice.subscription
        if (subscriptionId) {
          const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date()
          const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

          await db.updateTable("platform_subscriptions")
            .set({ status: "active", current_period_start: periodStart, current_period_end: periodEnd, updated_at: new Date() })
            .where("stripe_subscription_id", "=", subscriptionId)
            .execute()
          await db.updateTable("user_subscriptions")
            .set({ status: "active", current_period_start: periodStart, current_period_end: periodEnd, updated_at: new Date() })
            .where("stripe_subscription_id", "=", subscriptionId)
            .execute()
        }
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any
        await db.updateTable("platform_subscriptions")
          .set({ status: "cancelled", updated_at: new Date() })
          .where("stripe_subscription_id", "=", subscription.id)
          .execute()
        await db.updateTable("user_subscriptions")
          .set({ status: "cancelled", updated_at: new Date() })
          .where("stripe_subscription_id", "=", subscription.id)
          .execute()
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as any
        await db.updateTable("platform_subscriptions")
          .set({ status: "past_due", updated_at: new Date() })
          .where("stripe_subscription_id", "=", invoice.subscription)
          .execute()
        await db.updateTable("user_subscriptions")
          .set({ status: "past_due", updated_at: new Date() })
          .where("stripe_subscription_id", "=", invoice.subscription)
          .execute()
        break
      }
      case "account.updated": {
        // Stripe Connect account status change
        const account = event.data.object as any
        if (account.details_submitted) {
          await db.updateTable("users")
            .set({ stripe_onboarding_complete: true, updated_at: new Date() })
            .where("stripe_account_id", "=", account.id)
            .execute()
        }
        break
      }
    }

    // Only record processed event after successful processing
    await db.insertInto("stripe_events").values({
      id: uuidv4(),
      stripe_event_id: event.id,
      event_type: event.type,
    }).execute()
  } catch (error) {
    console.error("Stripe webhook processing error:", error)
    // Don't record the event — allow retry on next webhook delivery
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
