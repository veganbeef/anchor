import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/middleware"
import { createCheckoutSession, getOrCreateCustomer } from "@/lib/payments/stripe"

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { feedId } = await request.json()
  const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`
  const customerId = await getOrCreateCustomer(user.id, user.email)

  const url = await createCheckoutSession({
    priceUsd: 10,
    mode: "subscription",
    customerId,
    successUrl: `${baseUrl}/dashboard?checkout=success&feed=${feedId}`,
    cancelUrl: `${baseUrl}/dashboard?checkout=cancelled`,
    metadata: { feed_id: feedId, user_id: user.id, type: "platform_subscription", product_name: "Anchor Feed Generation" },
  })

  return NextResponse.json({ url })
}
