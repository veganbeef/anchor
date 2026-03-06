/**
 * Ingests content from all 4 source types:
 *   - Email (Resend), Podcasts (AssemblyAI), Twitter (SocialData), Farcaster (Neynar)
 *
 * Triggered every 4 hours: Vercel cron → /api/cron/ingest → inngest.send("cron/ingest").
 * Each source type runs as a separate Inngest step for independent retry/failure handling.
 * Source types are feature-flagged by env var — omitting the API key disables that source.
 */
import { inngest } from "@/lib/scheduling/inngest"
import { createLogger } from "@/lib/observability/logger"

export const ingestSources = inngest.createFunction(
  { id: "ingest-sources" },
  { event: "cron/ingest" },
  async ({ step }) => {
    const correlationId = crypto.randomUUID()
    const log = createLogger("inngest:ingest-sources", correlationId)

    const emailResult = await step.run("ingest-emails", async () => {
      log.info("Starting email ingestion")
      const { ingestEmails } = await import("@/lib/ingestion/email")
      return ingestEmails()
    })

    const podcastResult = await step.run("ingest-podcasts", async () => {
      log.info("Starting podcast ingestion")
      const { ingestPodcasts } = await import("@/lib/ingestion/podcast")
      return ingestPodcasts()
    })

    const twitterResult = await step.run("ingest-twitter", async () => {
      log.info("Starting twitter ingestion")
      const { ingestTwitter } = await import("@/lib/ingestion/twitter")
      return ingestTwitter()
    })

    const farcasterResult = await step.run("ingest-farcaster", async () => {
      log.info("Starting farcaster ingestion")
      const { ingestFarcaster } = await import("@/lib/ingestion/farcaster")
      return ingestFarcaster()
    })

    log.info("Ingestion complete", {
      email: emailResult,
      podcast: podcastResult,
      twitter: twitterResult,
      farcaster: farcasterResult,
    })

    return { emailResult, podcastResult, twitterResult, farcasterResult }
  },
)
