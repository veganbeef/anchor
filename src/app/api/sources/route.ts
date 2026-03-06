import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth/middleware"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest) {
  const { success } = await checkRateLimit(getClientIp(request))
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const url = new URL(request.url)
  const type = url.searchParams.get("type")
  const search = url.searchParams.get("q")

  let query = db.selectFrom("sources").where("is_active", "=", true)
  if (type) query = query.where("type", "=", type)
  if (search) query = query.where("name", "ilike", `%${search}%`)

  const sources = await query.orderBy("name", "asc").limit(50).selectAll().execute()
  return NextResponse.json({ sources }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json()
  const id = uuidv4()

  await db
    .insertInto("sources")
    .values({
      id,
      type: body.type,
      name: body.name,
      identifier: body.identifier,
      description: body.description || null,
      image_url: body.imageUrl || null,
      config: body.config ? JSON.stringify(body.config) : null,
    })
    .execute()

  const source = await db.selectFrom("sources").where("id", "=", id).selectAll().executeTakeFirstOrThrow()
  return NextResponse.json({ source }, { status: 201 })
}
