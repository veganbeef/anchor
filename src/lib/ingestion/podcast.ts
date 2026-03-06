/**
 * Podcast ingestion via RSS feed parsing + AssemblyAI async transcription.
 *
 * Feature-flagged: returns early if ASSEMBLYAI_API_KEY is not set.
 *
 * Flow: parse RSS feed -> dedup by episode GUID -> submit audio to AssemblyAI
 * with webhook URL -> store as "processing" content items. The AssemblyAI
 * webhook (/api/webhooks/assemblyai) updates the body and status to "ready"
 * once transcription completes.
 *
 * Uses webhook mode (not polling) for AssemblyAI -- transcription completes
 * asynchronously.
 */
import { db } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

export async function ingestPodcasts(): Promise<{ submitted: number; skipped: number }> {
  if (!process.env.ASSEMBLYAI_API_KEY) return { submitted: 0, skipped: 0 }

  const podcastSources = await db
    .selectFrom("sources")
    .where("type", "=", "podcast")
    .where("is_active", "=", true)
    .selectAll()
    .execute()

  let submitted = 0
  let skipped = 0

  for (const source of podcastSources) {
    try {
      const config = source.config as { feedUrl?: string } | null
      if (!config?.feedUrl) continue

      const episodes = await fetchRssEpisodes(config.feedUrl)

      for (const episode of episodes) {
        const existing = await db
          .selectFrom("content_items")
          .where("source_id", "=", source.id)
          .where("external_id", "=", episode.guid)
          .executeTakeFirst()

        if (existing) {
          skipped++
          continue
        }

        // Submit to AssemblyAI for transcription
        const transcriptId = await submitToAssemblyAI(episode.audioUrl)

        await db
          .insertInto("content_items")
          .values({
            id: uuidv4(),
            source_id: source.id,
            external_id: episode.guid,
            title: episode.title,
            body: null, // Will be filled by AssemblyAI webhook
            url: episode.url,
            author_name: episode.author,
            author_handle: null,
            status: "processing",
            published_at: new Date(episode.publishedAt),
            metadata: JSON.stringify({ assemblyai_transcript_id: transcriptId }),
          })
          .execute()
        submitted++
      }

      await db
        .updateTable("sources")
        .set({ last_fetched_at: new Date() })
        .where("id", "=", source.id)
        .execute()
    } catch (error) {
      console.error(`Podcast ingestion error for source ${source.id}:`, error)
    }
  }

  return { submitted, skipped }
}

interface RssEpisode {
  guid: string
  title: string
  audioUrl: string
  url: string
  author: string | null
  publishedAt: string
}

async function fetchRssEpisodes(feedUrl: string): Promise<RssEpisode[]> {
  const response = await fetch(feedUrl)
  if (!response.ok) return []
  const xml = await response.text()
  // Simple RSS XML parsing (extract items with enclosures)
  const items: RssEpisode[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]
    const guid = extractTag(itemXml, "guid") || extractAttribute(itemXml, "enclosure", "url") || ""
    const audioUrl = extractAttribute(itemXml, "enclosure", "url") || ""
    if (!audioUrl) continue
    items.push({
      guid,
      title: extractTag(itemXml, "title") || "Untitled",
      audioUrl,
      url: extractTag(itemXml, "link") || "",
      author: extractTag(itemXml, "itunes:author") || extractTag(itemXml, "author") || null,
      publishedAt: extractTag(itemXml, "pubDate") || new Date().toISOString(),
    })
  }
  return items.slice(0, 10) // Latest 10 episodes
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`))
  return match ? (match[1] || match[2] || null) : null
}

function extractAttribute(xml: string, tag: string, attr: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'))
  return match ? match[1] : null
}

async function submitToAssemblyAI(audioUrl: string): Promise<string> {
  const webhookUrl = `${process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`}/api/webhooks/assemblyai`
  const response = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      Authorization: process.env.ASSEMBLYAI_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      webhook_url: webhookUrl,
    }),
  })

  if (!response.ok) {
    throw new Error(`AssemblyAI error: ${response.status}`)
  }

  const data = await response.json() as { id: string }
  return data.id
}
