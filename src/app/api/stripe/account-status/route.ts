import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/middleware"
import { checkAccountStatus } from "@/lib/payments/connect"

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const status = await checkAccountStatus(user.id)
  return NextResponse.json(status)
}
