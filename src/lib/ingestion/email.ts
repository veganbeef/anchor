/**
 * Email newsletter ingestion via Resend incoming email API.
 *
 * Feature-flagged: returns early if RESEND_API_KEY is not set.
 *
 * Flow: fetch all emails from Resend -> filter by source identifier (sender
 * address) -> dedup via (source_id, external_id) -> convert HTML to plain
 * text -> store as "ready" content items.
 *
 * HTML-to-text conversion strips style/script tags first, then all remaining
 * HTML tags.
 */
import { db } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"
import { stripHtml } from "./html"

interface ResendEmail {
  id: string
  from: string
  subject: string
  html: string
  text: string
  created_at: string
}

export async function ingestEmails(): Promise<{ processed: number; skipped: number }> {
  if (!process.env.RESEND_API_KEY) return { processed: 0, skipped: 0 }

  // Fetch emails from configured sources
  const emailSources = await db
    .selectFrom("sources")
    .where("type", "=", "email")
    .where("is_active", "=", true)
    .selectAll()
    .execute()

  let processed = 0
  let skipped = 0

  // Fetch all incoming emails once, then filter per source
  const allEmails = await fetchResendEmails()

  for (const source of emailSources) {
    try {
      // Filter emails by the source's identifier (sender address)
      const senderFilter = source.identifier.toLowerCase()
      const emails = allEmails.filter((email) =>
        email.from.toLowerCase().includes(senderFilter)
      )

      for (const email of emails) {
        const existing = await db
          .selectFrom("content_items")
          .where("source_id", "=", source.id)
          .where("external_id", "=", email.id)
          .executeTakeFirst()

        if (existing) {
          skipped++
          continue
        }

        // Convert HTML to plain text (strip tags)
        const plainText = email.text || stripHtml(email.html)

        await db
          .insertInto("content_items")
          .values({
            id: uuidv4(),
            source_id: source.id,
            external_id: email.id,
            title: email.subject,
            body: plainText,
            url: null,
            author_name: null,
            author_handle: email.from,
            status: "ready",
            published_at: new Date(email.created_at),
            metadata: null,
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
      console.error(`Email ingestion error for source ${source.id}:`, error)
    }
  }

  return { processed, skipped }
}

async function fetchResendEmails(): Promise<ResendEmail[]> {
  // Resend incoming email API endpoint
  const response = await fetch("https://api.resend.com/emails", {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  })
  if (!response.ok) return []
  const data = await response.json() as { data: ResendEmail[] }
  return data.data || []
}

export { stripHtml } from "./html"
