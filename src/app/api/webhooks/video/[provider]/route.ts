/**
 * Video provider webhook handler — receives generation completion callbacks
 * from D-ID, HeyGen, etc.
 *
 * Security: provider-specific signature verification via
 * VideoProvider.verifyWebhookSignature().
 *
 * Idempotent: skips already-completed videos.
 *
 * Sends "video/generation.complete" event to resume the Inngest waitForEvent
 * in generate-feed-summary.
 */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createVideoProvider } from "@/lib/video/factory"
import { inngest } from "@/lib/scheduling/inngest"
import type { VideoProviderName } from "@/types"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerName } = await params
  const body = await request.text()
  const headers = request.headers

  const provider = await createVideoProvider(providerName as VideoProviderName)

  // Verify signature
  if (!provider.verifyWebhookSignature(body, headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const parsed = JSON.parse(body)
  const payload = provider.parseWebhook(parsed, headers)
  if (!payload) return NextResponse.json({ ok: true })

  // Check if already processed (idempotency)
  const video = await db
    .selectFrom("feed_videos")
    .where("external_job_id", "=", payload.jobId)
    .select(["id", "status"])
    .executeTakeFirst()

  if (!video) return NextResponse.json({ ok: true }) // Unknown job
  if (video.status === "completed") return NextResponse.json({ ok: true }) // Already done

  // Send event to resume Inngest waitForEvent
  await inngest.send({
    name: "video/generation.complete",
    data: {
      jobId: payload.jobId,
      videoId: video.id,
      status: payload.status,
      videoUrl: payload.videoUrl,
      thumbnailUrl: payload.thumbnailUrl,
      durationSeconds: payload.durationSeconds,
      error: payload.error,
    },
  })

  return NextResponse.json({ ok: true })
}
