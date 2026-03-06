import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const dbUser = await db.selectFrom("users").where("id", "=", user.id).selectAll().executeTakeFirstOrThrow()
  return NextResponse.json({ user: dbUser })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = { updated_at: new Date() }

  if (body.displayName !== undefined) updates.display_name = body.displayName
  if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl
  if (body.walletAddress !== undefined) updates.wallet_address = body.walletAddress

  if (body.username !== undefined) {
    // Check uniqueness
    const existing = await db.selectFrom("users").where("username", "=", body.username).where("id", "!=", user.id).executeTakeFirst()
    if (existing) return NextResponse.json({ error: "Username taken" }, { status: 409 })
    updates.username = body.username
  }

  await db.updateTable("users").set(updates).where("id", "=", user.id).execute()
  const updated = await db.selectFrom("users").where("id", "=", user.id).selectAll().executeTakeFirstOrThrow()
  return NextResponse.json({ user: updated })
}
