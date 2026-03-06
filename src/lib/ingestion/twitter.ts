/**
 * Twitter/X ingestion via SocialData.tools API.
 *
 * Optional source type, off by default -- requires SOCIALDATA_API_KEY env var.
 *
 * Fetches the latest 50 tweets per handle and stores them with engagement
 * metrics (likes, retweets, replies).
 *
 * Cost: ~$0.20 per 1,000 tweets.
 */
import { db } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

export async function ingestTwitter(): Promise<{ processed: number; skipped: number }> {
  if (!process.env.SOCIALDATA_API_KEY) return { processed: 0, skipped: 0 }

  const twitterSources = await db
    .selectFrom("sources")
    .where("type", "=", "twitter")
    .where("is_active", "=", true)
    .selectAll()
    .execute()

  let processed = 0
  let skipped = 0

  for (const source of twitterSources) {
    try {
      const tweets = await fetchTweets(source.identifier)

      for (const tweet of tweets) {
        const existing = await db
          .selectFrom("content_items")
          .where("source_id", "=", source.id)
          .where("external_id", "=", tweet.id)
          .executeTakeFirst()

        if (existing) {
          skipped++
          continue
        }

        await db
          .insertInto("content_items")
          .values({
            id: uuidv4(),
            source_id: source.id,
            external_id: tweet.id,
            title: null,
            body: tweet.text,
            url: `https://twitter.com/${source.identifier}/status/${tweet.id}`,
            author_name: tweet.user?.name || null,
            author_handle: source.identifier,
            status: "ready",
            published_at: new Date(tweet.created_at),
            metadata: JSON.stringify({
              likes: tweet.favorite_count,
              retweets: tweet.retweet_count,
              replies: tweet.reply_count,
            }),
          })
          .execute()
        processed++
      }

      await db
        .updateTable("sources")
        .set({ last_fetched_at: new Date() })
        .where("id", "=", source.id)
        .execute()
    } catch (error) {
      console.error(`Twitter ingestion error for source ${source.id}:`, error)
    }
  }

  return { processed, skipped }
}

interface Tweet {
  id: string
  text: string
  created_at: string
  user?: { name: string }
  favorite_count?: number
  retweet_count?: number
  reply_count?: number
}

async function fetchTweets(handle: string): Promise<Tweet[]> {
  const cleanHandle = handle.replace("@", "")
  const response = await fetch(
    `https://api.socialdata.tools/twitter/user/${cleanHandle}/tweets?limit=50`,
    {
      headers: { Authorization: `Bearer ${process.env.SOCIALDATA_API_KEY}` },
    },
  )

  if (!response.ok) return []
  const data = await response.json() as { tweets: Tweet[] }
  return data.tweets || []
}
