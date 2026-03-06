import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { v4 as uuidv4 } from "uuid"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string }> },
) {
  const { feedId } = await params
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const feed = await db.selectFrom("feeds").where("id", "=", feedId).select(["user_id"]).executeTakeFirst()
  if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 })
  if (feed.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const sources = await db
    .selectFrom("feed_sources")
    .innerJoin("sources", "sources.id", "feed_sources.source_id")
    .where("feed_sources.feed_id", "=", feedId)
    .orderBy("feed_sources.priority", "desc")
    .selectAll("sources")
    .select(["feed_sources.priority", "feed_sources.id as feed_source_id"])
    .execute()

  return NextResponse.json({ sources })
}

export async function POST(
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
    .insertInto("feed_sources")
    .values({
      id: uuidv4(),
      feed_id: feedId,
      source_id: body.sourceId,
      priority: body.priority ?? 1,
    })
    .onConflict((oc) => oc.columns(["feed_id", "source_id"]).doNothing())
    .execute()

  return NextResponse.json({ ok: true }, { status: 201 })
}
