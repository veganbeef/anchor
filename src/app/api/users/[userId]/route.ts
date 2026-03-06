import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { success } = await checkRateLimit(getClientIp(request))
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const { userId } = await params

  const user = await db
    .selectFrom("users")
    .where("id", "=", userId)
    .select(["id", "username", "display_name", "avatar_url", "created_at"])
    .executeTakeFirst()

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const feedCount = await db
    .selectFrom("feeds")
    .where("user_id", "=", userId)
    .where("is_public", "=", true)
    .select(db.fn.countAll<number>().as("count"))
    .executeTakeFirst()

  const videoCount = await db
    .selectFrom("feed_videos")
    .innerJoin("feeds", "feeds.id", "feed_videos.feed_id")
    .where("feeds.user_id", "=", userId)
    .where("feed_videos.status", "=", "completed")
    .select(db.fn.countAll<number>().as("count"))
    .executeTakeFirst()

  return NextResponse.json({
    user: {
      ...user,
      feedCount: Number(feedCount?.count || 0),
      videoCount: Number(videoCount?.count || 0),
    },
  }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  })
}
