import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/middleware"
import { requireAdmin, AuthError } from "@/lib/auth/admin"
import { refundPayment } from "@/lib/payments/refund"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    requireAdmin(user)

    const { paymentId, reason } = await request.json()
    if (!paymentId || !reason) {
      return NextResponse.json({ error: "paymentId and reason required" }, { status: 400 })
    }

    await refundPayment(paymentId, reason)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof Error && error.message === "Payment already refunded") {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    throw error
  }
}
