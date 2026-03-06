import { db } from "@/lib/db"
import { FeedCard } from "@/components/feeds/FeedCard"
import { HomeSignIn } from "./HomeSignIn"
import Link from "next/link"

export const revalidate = 300

export default async function HomePage() {
  const pinnedFeeds = await db
    .selectFrom("pinned_feeds")
    .innerJoin("feeds", "feeds.id", "pinned_feeds.feed_id")
    .innerJoin("users", "users.id", "feeds.user_id")
    .where("feeds.is_active", "=", true)
    .orderBy("pinned_feeds.sort_order", "asc")
    .selectAll("feeds")
    .select(["users.username as owner_username"])
    .execute()

  const recentVideos = await db
    .selectFrom("feed_videos")
    .innerJoin("feeds", "feeds.id", "feed_videos.feed_id")
    .innerJoin("feed_summaries", "feed_summaries.id", "feed_videos.summary_id")
    .innerJoin("users", "users.id", "feeds.user_id")
    .where("feed_videos.status", "=", "completed")
    .where("feeds.is_public", "=", true)
    .orderBy("feed_videos.created_at", "desc")
    .limit(12)
    .select([
      "feed_videos.id as video_id",
      "feed_videos.video_url",
      "feed_videos.thumbnail_url",
      "feed_summaries.title",
      "feeds.id as feed_id",
      "feeds.name as feed_name",
      "users.username as owner_username",
    ])
    .execute()

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold">Anchor</h1>
        <p className="text-gray-600 mt-2">AI-powered news video summaries from your favorite sources</p>
        <HomeSignIn />
      </header>

      {pinnedFeeds.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Featured Feeds</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pinnedFeeds.map((feed) => (
              <FeedCard
                key={feed.id}
                id={feed.id}
                name={feed.name}
                description={feed.description}
                ownerUsername={feed.owner_username}
                subscriptionPriceUsd={String(feed.subscription_price_usd)}
                isPublic={feed.is_public}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-semibold mb-4">Recent Videos</h2>
        {recentVideos.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentVideos.map((video) => (
              <Link key={video.video_id} href={`/feed/${video.feed_id}`} className="block rounded-lg border border-gray-200 overflow-hidden hover:border-gray-400 transition-colors">
                <div className="aspect-video bg-gray-100">
                  {video.thumbnail_url && <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm line-clamp-2">{video.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{video.feed_name} by @{video.owner_username}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No videos yet. Check back soon!</p>
        )}
      </section>
    </main>
  )
}
