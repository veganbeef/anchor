/**
 * AI-powered feed summarization — gathers content items, constructs prompt
 * with context, and generates a cited summary.
 *
 * Content selection: items from last 24 hours, ordered by feed_sources.priority
 * DESC then published_at DESC.
 *
 * Context: includes last 3 summaries for continuity (avoids repeating stories).
 *
 * @throws {EmptyFeedError} if no ready content items found (caught by
 *   generate-feed-summary to skip gracefully)
 */
import { db } from "@/lib/db"
import { getSummarizationProvider } from "@/lib/ai/factory"
import type { SummaryInput } from "@/types"

export async function generateFeedSummary(feedId: string): Promise<{ title: string; summary: string; contentItemIds: string[]; periodStart: Date; periodEnd: Date }> {
  const feed = await db
    .selectFrom("feeds")
    .where("id", "=", feedId)
    .selectAll()
    .executeTakeFirstOrThrow()

  // Gather content items from the last 24 hours
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const contentItems = await db
    .selectFrom("content_items")
    .innerJoin("feed_sources", "feed_sources.source_id", "content_items.source_id")
    .innerJoin("sources", "sources.id", "content_items.source_id")
    .where("feed_sources.feed_id", "=", feedId)
    .where("content_items.status", "=", "ready")
    .where("content_items.published_at", ">=", oneDayAgo)
    .orderBy("feed_sources.priority", "desc")
    .orderBy("content_items.published_at", "desc")
    .select([
      "content_items.id",
      "content_items.title",
      "content_items.body",
      "content_items.url",
      "content_items.author_name",
      "content_items.author_handle",
      "content_items.published_at",
      "sources.name as source_name",
    ])
    .execute()

  if (contentItems.length === 0) {
    throw new EmptyFeedError(feedId)
  }

  // Get previous summaries for context
  const previousSummaries = await db
    .selectFrom("feed_summaries")
    .where("feed_id", "=", feedId)
    .orderBy("generated_at", "desc")
    .limit(3)
    .select("summary")
    .execute()

  const input: SummaryInput = {
    contentItems: contentItems.map((item) => ({
      title: item.title,
      body: item.body,
      url: item.url,
      authorName: item.author_name,
      authorHandle: item.author_handle,
      sourceName: item.source_name,
      publishedAt: new Date(item.published_at),
    })),
    feedName: feed.name,
    previousSummaries: previousSummaries.map((s) => s.summary),
  }

  const provider = await getSummarizationProvider()
  const summary = await provider.generateSummary(input)
  const title = extractTitle(summary, feed.name)

  return {
    title,
    summary,
    contentItemIds: contentItems.map((item) => item.id),
    periodStart: oneDayAgo,
    periodEnd: now,
  }
}

function extractTitle(summary: string, feedName: string): string {
  // Try to extract the first heading from the summary
  const headingMatch = summary.match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1]

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${feedName} — ${today}`
}

export class EmptyFeedError extends Error {
  constructor(public feedId: string) {
    super(`No ready content items for feed ${feedId} in the last 24 hours`)
    this.name = "EmptyFeedError"
  }
}
