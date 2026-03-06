import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/middleware"
import { checkFeedAccess } from "@/lib/payments/subscription"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> },
) {
  const { feedId } = await params
  const user = await getAuthUser(request)
  const access = await checkFeedAccess(user?.id || null, feedId)
  return NextResponse.json(access)
}
