import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { checkFeedAccess } from "@/lib/payments/subscription"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> },
) {
  const { feedId } = await params
  const user = await getAuthUser(request)

  const access = await checkFeedAccess(user?.id || null, feedId)
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Payment required", reason: access.reason }, { status: 402 })
  }

  const videos = await db
    .selectFrom("feed_videos")
    .where("feed_id", "=", feedId)
    .orderBy("created_at", "desc")
    .limit(20)
    .selectAll()
    .execute()

  return NextResponse.json({ videos })
}
