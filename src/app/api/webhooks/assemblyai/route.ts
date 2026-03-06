/**
 * AssemblyAI webhook handler — receives podcast transcription completion callbacks.
 *
 * Security: HMAC-SHA256 signature verification using ASSEMBLYAI_WEBHOOK_SECRET.
 *
 * On completion: fetches full transcript text from AssemblyAI API, updates
 * content_item body + status to "ready".
 *
 * Idempotent: skips items already in "ready" status.
 */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "kysely"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  const body = await request.text()

  // Verify HMAC signature — required in production
  const webhookSecret = process.env.ASSEMBLYAI_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("ASSEMBLYAI_WEBHOOK_SECRET not configured — rejecting webhook")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }
  const signature = request.headers.get("x-assemblyai-signature")
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex")
  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const data = JSON.parse(body)
  const transcriptId = data.transcript_id
  const status = data.status

  // Find content item by AssemblyAI transcript ID using JSONB query
  const item = await db
    .selectFrom("content_items")
    .where("status", "in", ["processing", "ready"])
    .where(sql`metadata->>'assemblyai_transcript_id'`, "=", transcriptId)
    .selectAll()
    .executeTakeFirst()

  if (!item) return NextResponse.json({ ok: true }) // Idempotent

  if (item.status === "ready") return NextResponse.json({ ok: true }) // Already processed

  if (status === "completed") {
    // Fetch full transcript
    const transcriptResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      { headers: { Authorization: process.env.ASSEMBLYAI_API_KEY! } },
    )
    const transcript = await transcriptResponse.json() as { text: string }

    await db
      .updateTable("content_items")
      .set({ body: transcript.text, status: "ready", updated_at: new Date() })
      .where("id", "=", item.id)
      .execute()
  } else if (status === "error") {
    await db
      .updateTable("content_items")
      .set({ status: "failed", updated_at: new Date() })
      .where("id", "=", item.id)
      .execute()
  }

  return NextResponse.json({ ok: true })
}
