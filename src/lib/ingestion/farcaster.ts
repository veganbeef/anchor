/**
 * Farcaster cast ingestion via Neynar API v2.
 *
 * Feature-flagged: returns early if NEYNAR_API_KEY is not set.
 *
 * Supports two source modes, selected via source.config:
 *   - User casts: fetched by FID (config.fid)
 *   - Channel casts: fetched by channel ID (config.channelId)
 *
 * Stores casts with engagement metrics (likes, recasts, replies).
 */
import { db } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

export async function ingestFarcaster(): Promise<{ processed: number; skipped: number }> {
  if (!process.env.NEYNAR_API_KEY) return { processed: 0, skipped: 0 }

  const farcasterSources = await db
    .selectFrom("sources")
    .where("type", "=", "farcaster")
    .where("is_active", "=", true)
    .selectAll()
    .execute()

  let processed = 0
  let skipped = 0

  for (const source of farcasterSources) {
    try {
      const config = source.config as { fid?: number; channelId?: string } | null
      const casts = config?.channelId
        ? await fetchChannelCasts(config.channelId)
        : config?.fid
          ? await fetchUserCasts(config.fid)
          : []

      for (const cast of casts) {
        const existing = await db
          .selectFrom("content_items")
          .where("source_id", "=", source.id)
          .where("external_id", "=", cast.hash)
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
            external_id: cast.hash,
            title: null,
            body: cast.text,
            url: `https://warpcast.com/${cast.author?.username || "unknown"}/${cast.hash.slice(0, 10)}`,
            author_name: cast.author?.display_name || null,
            author_handle: cast.author?.username || null,
            status: "ready",
            published_at: new Date(cast.timestamp),
            metadata: JSON.stringify({
              likes: cast.reactions?.likes_count || 0,
              recasts: cast.reactions?.recasts_count || 0,
              replies: cast.replies?.count || 0,
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
      console.error(`Farcaster ingestion error for source ${source.id}:`, error)
    }
  }

  return { processed, skipped }
}

interface Cast {
  hash: string
  text: string
  timestamp: string
  author?: { username: string; display_name: string }
  reactions?: { likes_count: number; recasts_count: number }
  replies?: { count: number }
}

async function fetchUserCasts(fid: number): Promise<Cast[]> {
  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/feed/user/${fid}?limit=50`,
    {
      headers: { api_key: process.env.NEYNAR_API_KEY! },
    },
  )
  if (!response.ok) return []
  const data = await response.json() as { casts: Cast[] }
  return data.casts || []
}

async function fetchChannelCasts(channelId: string): Promise<Cast[]> {
  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/feed/channels?channel_ids=${channelId}&limit=50`,
    {
      headers: { api_key: process.env.NEYNAR_API_KEY! },
    },
  )
  if (!response.ok) return []
  const data = await response.json() as { casts: Cast[] }
  return data.casts || []
}
