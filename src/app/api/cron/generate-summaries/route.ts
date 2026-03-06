/**
 * Vercel cron endpoint for summary generation (every hour).
 *
 * Gated by CRON_SECRET Bearer token. Triggers generate-all-summaries Inngest
 * function which checks timezone-aware schedules and fans out.
 */
import { NextRequest, NextResponse } from "next/server"
import { inngest } from "@/lib/scheduling/inngest"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await inngest.send({ name: "cron/generate-summaries", data: {} })
  return NextResponse.json({ ok: true })
}
