import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { requireAdmin, AuthError } from "@/lib/auth/admin"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    requireAdmin(user)

    const pinnedFeeds = await db
      .selectFrom("pinned_feeds")
      .innerJoin("feeds", "feeds.id", "pinned_feeds.feed_id")
      .innerJoin("users", "users.id", "feeds.user_id")
      .orderBy("pinned_feeds.sort_order", "asc")
      .selectAll("pinned_feeds")
      .select(["feeds.name as feed_name", "users.username as owner_username"])
      .execute()

    return NextResponse.json({ pinnedFeeds })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    requireAdmin(user)

    const { feedId, sortOrder } = await request.json()

    await db.insertInto("pinned_feeds").values({
      id: uuidv4(),
      feed_id: feedId,
      sort_order: sortOrder ?? 0,
      pinned_by: user.id,
    }).execute()

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}
