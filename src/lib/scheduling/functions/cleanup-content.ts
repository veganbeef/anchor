import { inngest } from "@/lib/scheduling/inngest"
import { db } from "@/lib/db"
import { sql } from "kysely"
import { createLogger } from "@/lib/observability/logger"

/**
 * Weekly cleanup: deletes content_items older than 90 days.
 *
 * Summaries are self-contained (they embed cited text), so old content items
 * are not needed after summary generation. Runs every Sunday at 3 AM UTC via Inngest cron.
 */
export const cleanupContent = inngest.createFunction(
  { id: "cleanup-content" },
  { cron: "0 3 * * 0" }, // Every Sunday at 3 AM UTC
  async ({ step }) => {
    const log = createLogger("inngest:cleanup-content")

    const result = await step.run("delete-old-content", async () => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)

      const deleted = await db
        .deleteFrom("content_items")
        .where("created_at", "<", cutoff)
        .executeTakeFirst()

      const count = Number(deleted.numDeletedRows)
      log.info("Cleaned up old content items", { deletedCount: count, cutoffDate: cutoff.toISOString() })
      return { deleted: count }
    })

    return result
  },
)
