import { serve } from "inngest/next"
import { inngest } from "@/lib/scheduling/inngest"
import { ingestSources } from "@/lib/scheduling/functions/ingest-sources"
import { generateAllSummaries } from "@/lib/scheduling/functions/generate-all-summaries"
import { generateFeedSummary } from "@/lib/scheduling/functions/generate-feed-summary"
import { cleanupContent } from "@/lib/scheduling/functions/cleanup-content"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestSources, generateAllSummaries, generateFeedSummary, cleanupContent],
})
