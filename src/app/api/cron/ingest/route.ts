/**
 * Vercel cron endpoint for content ingestion (every 4 hours).
 *
 * Gated by CRON_SECRET Bearer token (Vercel automatically sends this for
 * configured crons). Triggers the ingest-sources Inngest function which fans
 * out to all source types.
 */
import { NextRequest, NextResponse } from "next/server"
import { inngest } from "@/lib/scheduling/inngest"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await inngest.send({ name: "cron/ingest", data: {} })
  return NextResponse.json({ ok: true })
}
