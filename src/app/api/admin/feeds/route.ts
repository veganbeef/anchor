import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { requireAdmin, AuthError } from "@/lib/auth/admin"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    requireAdmin(user)

    const feeds = await db
      .selectFrom("feeds")
      .innerJoin("users", "users.id", "feeds.user_id")
      .orderBy("feeds.created_at", "desc")
      .selectAll("feeds")
      .select(["users.username as owner_username", "users.display_name as owner_display_name"])
      .execute()

    return NextResponse.json({ feeds })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}
