import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/middleware"
import { createConnectAccount } from "@/lib/payments/connect"

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const url = await createConnectAccount(user.id, user.email)
  return NextResponse.json({ url })
}
