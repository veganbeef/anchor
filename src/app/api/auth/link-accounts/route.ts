import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/middleware"
import { mergeAccounts } from "@/lib/auth/account-linking"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { targetUserId } = await request.json()
  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ error: "targetUserId is required" }, { status: 400 })
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Cannot link to yourself" }, { status: 400 })
  }

  const target = await db
    .selectFrom("users")
    .where("id", "=", targetUserId)
    .select(["id", "merged_into_id"])
    .executeTakeFirst()

  if (!target) {
    return NextResponse.json({ error: "Target user not found" }, { status: 404 })
  }

  if (target.merged_into_id) {
    return NextResponse.json({ error: "Target account already merged" }, { status: 400 })
  }

  await mergeAccounts(user.id, targetUserId)

  return NextResponse.json({ success: true })
}
