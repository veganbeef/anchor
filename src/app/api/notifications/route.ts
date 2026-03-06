import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/middleware"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const notifications = await db
    .selectFrom("notifications")
    .where("user_id", "=", user.id)
    .where("is_read", "=", false)
    .orderBy("created_at", "desc")
    .selectAll()
    .execute()

  return NextResponse.json({ notifications })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ids } = await request.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 })
  }

  await db
    .updateTable("notifications")
    .set({ is_read: true })
    .where("id", "in", ids)
    .where("user_id", "=", user.id)
    .execute()

  return NextResponse.json({ success: true })
}
