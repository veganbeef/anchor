import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { requireAdmin, AuthError } from "@/lib/auth/admin"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    requireAdmin(user)

    // Get latest ingestion timestamps per source type
    const sources = await db
      .selectFrom("sources")
      .select(["type", db.fn.max("last_fetched_at").as("last_fetched")])
      .groupBy("type")
      .execute()

    // Video generation queue
    const pendingVideos = await db
      .selectFrom("feed_videos")
      .where("status", "in", ["pending", "generating"])
      .select(db.fn.countAll<number>().as("count"))
      .executeTakeFirst()

    const failedVideos = await db
      .selectFrom("feed_videos")
      .where("status", "=", "failed")
      .select(db.fn.countAll<number>().as("count"))
      .executeTakeFirst()

    return NextResponse.json({
      ingestion: sources,
      videoQueue: {
        pending: Number(pendingVideos?.count || 0),
        failed: Number(failedVideos?.count || 0),
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}
