import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { inngest } from "@/lib/scheduling/inngest"

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

  await inngest.send({
    name: "feed/generate-summary",
    data: { feedId, correlationId: crypto.randomUUID() },
  })

  return NextResponse.json({ ok: true, message: "Generation triggered" })
}
