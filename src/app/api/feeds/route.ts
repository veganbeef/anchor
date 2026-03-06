import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest) {
  const { success } = await checkRateLimit(getClientIp(request))
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const user = await getAuthUser(request)

  if (user) {
    // Return user's own feeds
    const feeds = await db
      .selectFrom("feeds")
      .where("user_id", "=", user.id)
      .orderBy("created_at", "desc")
      .selectAll()
      .execute()
    return NextResponse.json({ feeds })
  }

  // Guest: return public feeds
  const feeds = await db
    .selectFrom("feeds")
    .where("is_public", "=", true)
    .where("is_active", "=", true)
    .orderBy("created_at", "desc")
    .limit(20)
    .selectAll()
    .execute()
  return NextResponse.json({ feeds }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json()
  const id = uuidv4()

  await db
    .insertInto("feeds")
    .values({
      id,
      user_id: user.id,
      name: body.name,
      description: body.description || null,
      summary_hour: body.summaryHour ?? 9,
      timezone: body.timezone || "America/Los_Angeles",
      video_provider: body.videoProvider || "d-id",
    })
    .execute()

  const feed = await db.selectFrom("feeds").where("id", "=", id).selectAll().executeTakeFirstOrThrow()
  return NextResponse.json({ feed }, { status: 201 })
}
