import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { createCheckoutSession, getOrCreateCustomer } from "@/lib/payments/stripe"

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { feedId } = await request.json()
  const feed = await db.selectFrom("feeds").where("id", "=", feedId).selectAll().executeTakeFirstOrThrow()

  if (Number(feed.subscription_price_usd) === 0) {
    return NextResponse.json({ error: "Feed is free" }, { status: 400 })
  }

  const creator = await db.selectFrom("users").where("id", "=", feed.user_id).select(["stripe_account_id", "stripe_onboarding_complete"]).executeTakeFirstOrThrow()
  if (!creator.stripe_account_id || !creator.stripe_onboarding_complete) {
    return NextResponse.json({ error: "Creator has not set up payments" }, { status: 400 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`
  const customerId = await getOrCreateCustomer(user.id, user.email)

  const url = await createCheckoutSession({
    priceUsd: Number(feed.subscription_price_usd),
    mode: "subscription",
    customerId,
    successUrl: `${baseUrl}/feed/${feedId}?subscribed=true`,
    cancelUrl: `${baseUrl}/feed/${feedId}`,
    metadata: { feed_id: feedId, subscriber_id: user.id, creator_id: feed.user_id, type: "user_subscription", product_name: `${feed.name} Subscription` },
    connectedAccountId: creator.stripe_account_id,
    applicationFeePercent: 5,
  })

  return NextResponse.json({ url })
}
