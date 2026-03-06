/**
 * Daily fan-out — determines which feeds are due for generation and dispatches individual events.
 *
 * Triggered once daily at 8 AM UTC: Vercel cron → /api/cron/generate-summaries →
 * inngest.send("cron/generate-summaries").
 *
 * Generates all active video-enabled feeds that haven't run today. The once-per-day
 * guard in generate-feed-summary prevents double-runs.
 *
 * Note: Vercel Hobby tier limits cron jobs to once per day. The ingest cron runs at
 * 6 AM UTC to ensure fresh content is available before summary generation at 8 AM UTC.
 */
import { inngest } from "@/lib/scheduling/inngest"
import { db } from "@/lib/db"
import { createLogger } from "@/lib/observability/logger"

export const generateAllSummaries = inngest.createFunction(
  { id: "generate-all-summaries" },
  { event: "cron/generate-summaries" },
  async ({ step }) => {
    const log = createLogger("inngest:generate-all-summaries")

    const dueFeeds = await step.run("get-due-feeds", async () => {
      const today = new Date().toISOString().split("T")[0]

      const activeFeeds = await db
        .selectFrom("feeds")
        .where("is_active", "=", true)
        .where("video_enabled", "=", true)
        .select(["id", "last_run_date"])
        .execute()

      return activeFeeds.filter((feed) => {
        if (feed.last_run_date && String(feed.last_run_date) >= today) return false
        return true
      })
    })

    if (dueFeeds.length === 0) {
      log.info("No feeds due for generation")
      return { generated: 0 }
    }

    log.info(`Found ${dueFeeds.length} feeds due for generation`)

    // Fan out to individual feed generation functions
    const events = dueFeeds.map((feed) => ({
      name: "feed/generate-summary" as const,
      data: { feedId: feed.id, correlationId: crypto.randomUUID() },
    }))

    await step.sendEvent("fan-out-generation", events)

    return { generated: dueFeeds.length }
  },
)
