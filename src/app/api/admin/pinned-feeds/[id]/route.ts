import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { requireAdmin, AuthError } from "@/lib/auth/admin"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request)
    requireAdmin(user)

    const { id } = await params
    const { sortOrder } = await request.json()

    await db.updateTable("pinned_feeds").set({ sort_order: sortOrder }).where("id", "=", id).execute()
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request)
    requireAdmin(user)

    const { id } = await params
    await db.deleteFrom("pinned_feeds").where("id", "=", id).execute()
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }
}
