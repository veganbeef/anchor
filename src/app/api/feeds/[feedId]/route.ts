import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> },
) {
  const { feedId } = await params
  const feed = await db.selectFrom("feeds").where("id", "=", feedId).selectAll().executeTakeFirst()
  if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 })

  // Private feeds are only accessible to their owner
  if (!feed.is_public) {
    const user = await getAuthUser(request)
    if (!user || user.id !== feed.user_id) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }
  }

  return NextResponse.json({ feed }, {
    headers: feed.is_public ? { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } : {},
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> },
) {
  const { feedId } = await params
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const feed = await db.selectFrom("feeds").where("id", "=", feedId).select(["user_id"]).executeTakeFirst()
  if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 })
  if (feed.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  await db
    .updateTable("feeds")
    .set({
      name: body.name,
      description: body.description,
      summary_hour: body.summaryHour,
      timezone: body.timezone,
      is_public: body.isPublic,
      subscription_price_usd: body.subscriptionPriceUsd,
      per_video_price_usd: body.perVideoPriceUsd,
      video_provider: body.videoProvider,
      video_config: body.videoConfig ? JSON.stringify(body.videoConfig) : undefined,
      metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
      updated_at: new Date(),
    })
    .where("id", "=", feedId)
    .execute()

  const updated = await db.selectFrom("feeds").where("id", "=", feedId).selectAll().executeTakeFirstOrThrow()
  return NextResponse.json({ feed: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> },
) {
  const { feedId } = await params
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const feed = await db.selectFrom("feeds").where("id", "=", feedId).select(["user_id"]).executeTakeFirst()
  if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 })
  if (feed.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await db.deleteFrom("feeds").where("id", "=", feedId).execute()
  return NextResponse.json({ ok: true })
}
