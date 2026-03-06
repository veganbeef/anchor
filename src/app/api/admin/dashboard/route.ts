import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { requireAdmin, AuthError } from "@/lib/auth/admin"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    requireAdmin(user)

    const [userCount, feedCount, videoCount, revenueResult] = await Promise.all([
      db.selectFrom("users").select(db.fn.countAll<number>().as("count")).executeTakeFirst(),
      db.selectFrom("feeds").where("is_active", "=", true).select(db.fn.countAll<number>().as("count")).executeTakeFirst(),
      db.selectFrom("feed_videos").where("status", "=", "completed").select(db.fn.countAll<number>().as("count")).executeTakeFirst(),
      db.selectFrom("payments").where("status", "=", "completed").select(db.fn.sum<string>("amount_usd").as("total")).executeTakeFirst(),
    ])

    return NextResponse.json({
      totalUsers: Number(userCount?.count || 0),
      activeFeeds: Number(feedCount?.count || 0),
      totalVideos: Number(videoCount?.count || 0),
      totalRevenue: Number(revenueResult?.total || 0),
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}
