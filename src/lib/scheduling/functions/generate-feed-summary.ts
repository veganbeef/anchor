/**
 * Per-feed summary generation pipeline — the core 9-step Inngest function.
 *
 * Steps:
 *   1. Atomic once-per-day guard (UPDATE WHERE last_run_date < today)
 *   2. Check feed exists
 *   3. Generate AI summary
 *   4. Generate news anchor script
 *   5. Save to feed_summaries
 *   6. Submit video to provider
 *   7. waitForEvent for video webhook (30m timeout)
 *   8. Handle timeout with retry (exponential backoff: 5m, 15m, 45m, max 3)
 *   9. Finalize video (download from provider CDN → Vercel Blob)
 *
 * Concurrency limit: 10 concurrent executions to prevent AI API rate limiting during fan-out.
 * Correlation ID propagated to both Axiom logs and Sentry tags for end-to-end tracing.
 */
import { inngest } from "@/lib/scheduling/inngest"
import { db } from "@/lib/db"
import { createLogger } from "@/lib/observability/logger"
import { setCorrelationId } from "@/lib/observability/sentry"
import { v4 as uuidv4 } from "uuid"

export const generateFeedSummary = inngest.createFunction(
  {
    id: "generate-feed-summary",
    concurrency: { limit: 10 },
    retries: 2,
  },
  { event: "feed/generate-summary" },
  async ({ event, step }) => {
    const { feedId, correlationId } = event.data
    const log = createLogger("inngest:generate-feed-summary", correlationId)
    setCorrelationId(correlationId)

    // Step 1: Atomic once-per-day guard
    const guardResult = await step.run("guard-once-per-day", async () => {
      const today = new Date().toISOString().split("T")[0]
      const result = await db
        .updateTable("feeds")
        .set({ last_run_date: today })
        .where("id", "=", feedId)
        .where(({ or, eb }) =>
          or([eb("last_run_date", "is", null), eb("last_run_date", "<", today)]),
        )
        .executeTakeFirst()

      if (!result || Number(result.numUpdatedRows) === 0) {
        return { skipped: true, reason: "already_ran_today" }
      }
      return { skipped: false }
    })

    if (guardResult.skipped) {
      log.info("Feed already ran today, skipping", { feedId })
      return guardResult
    }

    // Step 2: Check feed still exists
    const feed = await step.run("check-feed-exists", async () => {
      return db.selectFrom("feeds").where("id", "=", feedId).selectAll().executeTakeFirst()
    })

    if (!feed) {
      log.warn("Feed no longer exists, aborting", { feedId })
      return { skipped: true, reason: "feed_deleted" }
    }

    // Step 3: Generate summary
    const summaryResult = await step.run("generate-summary", async () => {
      log.info("Generating summary", { feedId })
      const { generateFeedSummary: genSummary } = await import("@/lib/processing/summarizer")
      try {
        return await genSummary(feedId)
      } catch (error) {
        if ((error as Error).name === "EmptyFeedError") {
          return null
        }
        throw error
      }
    })

    if (!summaryResult) {
      log.info("No content items, skipping generation", { feedId })
      // Update metadata to track skip — merge with existing metadata
      await step.run("record-skip", async () => {
        const currentFeed = await db
          .selectFrom("feeds")
          .where("id", "=", feedId)
          .select(["metadata"])
          .executeTakeFirst()
        const existingMeta = (currentFeed?.metadata as Record<string, unknown>) || {}
        await db
          .updateTable("feeds")
          .set({
            metadata: JSON.stringify({
              ...existingMeta,
              lastSkippedReason: "no_content",
              lastSkippedAt: new Date().toISOString(),
            }),
          })
          .where("id", "=", feedId)
          .execute()
      })
      return { skipped: true, reason: "no_content" }
    }

    // Step 4: Generate script
    const script = await step.run("generate-script", async () => {
      log.info("Generating script", { feedId })
      const { generateScript } = await import("@/lib/processing/script-writer")
      const feedMeta = feed.metadata as { tone?: string; maxLength?: number } | null
      return generateScript(summaryResult.summary, feed.name, {
        tone: feedMeta?.tone,
        maxWords: feedMeta?.maxLength,
      })
    })

    // Step 5: Save summary
    const summaryId = await step.run("save-summary", async () => {
      const id = uuidv4()
      await db
        .insertInto("feed_summaries")
        .values({
          id,
          feed_id: feedId,
          title: summaryResult.title,
          summary: summaryResult.summary,
          script,
          content_item_ids: JSON.stringify(summaryResult.contentItemIds),
          period_start: summaryResult.periodStart,
          period_end: summaryResult.periodEnd,
        })
        .execute()
      log.info("Summary saved", { feedId, summaryId: id })
      return id
    })

    // Step 6: Submit video (if enabled)
    if (feed.video_enabled) {
      const videoId = uuidv4()

      const videoResult = await step.run("submit-video", async () => {
        const { createVideoProvider } = await import("@/lib/video/factory")
        const provider = await createVideoProvider(feed.video_provider as any)

        // Create video record
        await db
          .insertInto("feed_videos")
          .values({
            id: videoId,
            summary_id: summaryId,
            feed_id: feedId,
            provider: feed.video_provider || "d-id",
            status: "generating",
          })
          .execute()

        const videoConfig = feed.video_config as { avatarId?: string; voiceId?: string; style?: string } | null
        const result = await provider.submit({
          script,
          avatarId: videoConfig?.avatarId,
          voiceId: videoConfig?.voiceId,
          style: videoConfig?.style,
        })

        await db
          .updateTable("feed_videos")
          .set({ external_job_id: result.jobId })
          .where("id", "=", videoId)
          .execute()

        log.info("Video submitted", { feedId, videoId, jobId: result.jobId })
        return result
      })

      // Step 7: Wait for video completion webhook (or timeout)
      const completion = await step.waitForEvent("wait-for-video", {
        event: "video/generation.complete",
        timeout: "30m",
        match: "data.jobId",
      })

      // Step 8: Handle timeout with retry
      if (!completion) {
        const video = await step.run("check-retry", async () => {
          return db
            .selectFrom("feed_videos")
            .where("id", "=", videoId)
            .select(["retry_count", "max_retries"])
            .executeTakeFirst()
        })

        if (video && video.retry_count < (video.max_retries ?? 3)) {
          const currentRetry = video.retry_count
          log.warn("Video generation timed out, retrying", { feedId, videoId, retryCount: currentRetry })

          await db
            .updateTable("feed_videos")
            .set({ retry_count: currentRetry + 1, status: "generating", error_message: "Generation timed out" })
            .where("id", "=", videoId)
            .execute()

          // Exponential backoff: 5m, 15m, 45m
          await step.sleep(`retry-backoff-${currentRetry}`, `${5 * Math.pow(3, currentRetry)}m`)

          // Re-submit to provider
          await step.run(`retry-submit-${currentRetry}`, async () => {
            const { createVideoProvider } = await import("@/lib/video/factory")
            const provider = await createVideoProvider(feed.video_provider as any)
            const videoConfig = feed.video_config as { avatarId?: string; voiceId?: string; style?: string } | null
            const result = await provider.submit({
              script,
              avatarId: videoConfig?.avatarId,
              voiceId: videoConfig?.voiceId,
              style: videoConfig?.style,
            })
            await db
              .updateTable("feed_videos")
              .set({ external_job_id: result.jobId })
              .where("id", "=", videoId)
              .execute()
            log.info("Video re-submitted", { feedId, videoId, jobId: result.jobId, retry: currentRetry + 1 })
          })
        } else {
          log.error("Video generation failed after max retries", { feedId, videoId })
          await db
            .updateTable("feed_videos")
            .set({ status: "failed", error_message: "Max retries exceeded" })
            .where("id", "=", videoId)
            .execute()
        }
      }

      // Step 9: Finalize video
      await step.run("finalize-video", async () => {
        if (!completion) return

        if (completion.data.status === "failed") {
          await db
            .updateTable("feed_videos")
            .set({ status: "failed", error_message: completion.data.error || "Unknown error" })
            .where("id", "=", videoId)
            .execute()
          return
        }

        // Download from provider CDN and upload to Vercel Blob
        if (completion.data.videoUrl) {
          try {
            const { persistVideo } = await import("@/lib/video/storage")
            const { url } = await persistVideo(videoId, completion.data.videoUrl)
            await db
              .updateTable("feed_videos")
              .set({
                status: "completed",
                video_url: url,
                thumbnail_url: completion.data.thumbnailUrl || null,
                duration_seconds: completion.data.durationSeconds || null,
              })
              .where("id", "=", videoId)
              .execute()
            log.info("Video finalized", { feedId, videoId, url })
          } catch (error) {
            log.error("Failed to persist video", { feedId, videoId, error: String(error) })
            // Still save the provider URL as fallback
            await db
              .updateTable("feed_videos")
              .set({
                status: "completed",
                video_url: completion.data.videoUrl,
                thumbnail_url: completion.data.thumbnailUrl || null,
                duration_seconds: completion.data.durationSeconds || null,
              })
              .where("id", "=", videoId)
              .execute()
          }
        }
      })

      // Notify feed owner that video is ready
      await step.run("notify-owner", async () => {
        if (!completion || completion.data.status === "failed") return
        const { createNotification } = await import("@/lib/notifications")
        await createNotification(
          feed.user_id,
          "video_ready",
          `Your video for "${feed.name}" is ready`,
          "Your daily news video has been generated and is ready to watch.",
          feedId,
        )
      })
    }

    log.info("Feed generation complete", { feedId, summaryId })
    return { feedId, summaryId, success: true }
  },
)
