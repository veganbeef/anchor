import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { VideoPlayer } from "@/components/video/VideoPlayer"
import { PaywallGate } from "@/components/payments/PaywallGate"
import type { Metadata } from "next"

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ feedId: string }> }): Promise<Metadata> {
  const { feedId } = await params

  const feed = await db
    .selectFrom("feeds")
    .where("id", "=", feedId)
    .select(["name", "description"])
    .executeTakeFirst()

  if (!feed) return { title: "Feed Not Found" }

  const latestVideo = await db
    .selectFrom("feed_videos")
    .where("feed_id", "=", feedId)
    .where("status", "=", "completed")
    .orderBy("created_at", "desc")
    .select(["thumbnail_url"])
    .executeTakeFirst()

  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "https://anchor.app"
  const feedUrl = `${baseUrl}/feed/${feedId}`
  const imageUrl = latestVideo?.thumbnail_url || `${baseUrl}/og-default.png`

  return {
    title: feed.name,
    description: feed.description || `Watch AI-generated news videos from ${feed.name}`,
    openGraph: {
      title: feed.name,
      description: feed.description || undefined,
      images: [imageUrl],
    },
    other: {
      "fc:frame": "vNext",
      "fc:frame:image": imageUrl,
      "fc:frame:button:1": "Watch",
      "fc:frame:button:1:action": "link",
      "fc:frame:button:1:target": feedUrl,
    },
  }
}

export default async function FeedPublicPage({ params }: { params: Promise<{ feedId: string }> }) {
  const { feedId } = await params

  const feed = await db
    .selectFrom("feeds")
    .innerJoin("users", "users.id", "feeds.user_id")
    .where("feeds.id", "=", feedId)
    .selectAll("feeds")
    .select(["users.username as owner_username", "users.display_name as owner_display_name"])
    .executeTakeFirst()

  if (!feed) notFound()

  const latestSummary = await db
    .selectFrom("feed_summaries")
    .where("feed_id", "=", feedId)
    .orderBy("generated_at", "desc")
    .selectAll()
    .executeTakeFirst()

  const latestVideo = await db
    .selectFrom("feed_videos")
    .where("feed_id", "=", feedId)
    .where("status", "=", "completed")
    .orderBy("created_at", "desc")
    .selectAll()
    .executeTakeFirst()

  const price = Number(feed.subscription_price_usd)
  const videoPrice = Number(feed.per_video_price_usd)
  const isFree = price === 0 && videoPrice === 0

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{feed.name}</h1>
        {feed.description && <p className="text-gray-600 mt-2">{feed.description}</p>}
        <p className="text-sm text-gray-500 mt-2">
          by <a href={`/u/${feed.owner_username}`} className="hover:underline">@{feed.owner_username}</a>
          {price > 0 && <span className="ml-3 text-green-600 font-medium">${price}/mo</span>}
          {isFree && <span className="ml-3 text-gray-400">Free</span>}
        </p>
      </header>

      {isFree ? (
        <>
          {latestVideo?.video_url && (
            <div className="mb-8">
              <VideoPlayer videoUrl={latestVideo.video_url} thumbnailUrl={latestVideo.thumbnail_url} title={latestSummary?.title} />
            </div>
          )}
          {latestSummary && (
            <article className="prose max-w-none">
              <h2>{latestSummary.title}</h2>
              <div className="whitespace-pre-wrap">{latestSummary.summary}</div>
            </article>
          )}
        </>
      ) : (
        <PaywallGate feedId={feedId} subscriptionPriceUsd={price} perVideoPriceUsd={videoPrice}>
          {latestVideo?.video_url && (
            <div className="mb-8">
              <VideoPlayer videoUrl={latestVideo.video_url} thumbnailUrl={latestVideo.thumbnail_url} title={latestSummary?.title} />
            </div>
          )}
          {latestSummary && (
            <article className="prose max-w-none">
              <h2>{latestSummary.title}</h2>
              <div className="whitespace-pre-wrap">{latestSummary.summary}</div>
            </article>
          )}
        </PaywallGate>
      )}

      {!latestSummary && !latestVideo && (
        <p className="text-gray-500 text-center py-12">No content yet. Check back soon!</p>
      )}
    </main>
  )
}
