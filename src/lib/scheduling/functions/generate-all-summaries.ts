/**
 * Hourly fan-out — determines which feeds are due for generation and dispatches individual events.
 *
 * Triggered every hour: Vercel cron → /api/cron/generate-summaries → inngest.send("cron/generate-summaries").
 * Schedule check: filters active feeds where current hour in feed's timezone matches summary_hour
 * AND last_run_date < today.
 *
 * Uses date-fns-tz for deterministic timezone conversion (not toLocaleString, which is
 * unreliable in serverless). DST edge case: a feed may run 1 hour late at worst — never
 * double-runs, never skips a day.
 */
import { inngest } from "@/lib/scheduling/inngest"
import { db } from "@/lib/db"
import { createLogger } from "@/lib/observability/logger"
import { toZonedTime } from "date-fns-tz"

export const generateAllSummaries = inngest.createFunction(
  { id: "generate-all-summaries" },
  { event: "cron/generate-summaries" },
  async ({ step }) => {
    const log = createLogger("inngest:generate-all-summaries")

    const dueFeeds = await step.run("get-due-feeds", async () => {
      const now = new Date()
      const today = now.toISOString().split("T")[0]

      const activeFeeds = await db
        .selectFrom("feeds")
        .where("is_active", "=", true)
        .where("video_enabled", "=", true)
        .select(["id", "summary_hour", "timezone", "last_run_date"])
        .execute()

      return activeFeeds.filter((feed) => {
        // Check if already ran today
        if (feed.last_run_date && String(feed.last_run_date) >= today) return false

        // Check if current hour matches feed's summary_hour in its timezone
        const feedNow = toZonedTime(now, feed.timezone)
        return feedNow.getHours() === feed.summary_hour
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
