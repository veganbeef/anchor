import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { requireAdmin, AuthError } from "@/lib/auth/admin"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    requireAdmin(user)

    const payments = await db
      .selectFrom("payments")
      .orderBy("created_at", "desc")
      .limit(100)
      .selectAll()
      .execute()

    return NextResponse.json({ payments })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}
