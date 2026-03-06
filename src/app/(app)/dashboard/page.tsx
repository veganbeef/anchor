import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FeedCard } from "@/components/feeds/FeedCard"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const userId = session.user.id

  const feeds = await db
    .selectFrom("feeds")
    .where("user_id", "=", userId)
    .where("is_active", "=", true)
    .orderBy("created_at", "desc")
    .selectAll()
    .execute()

  const recentVideos = await db
    .selectFrom("feed_videos")
    .innerJoin("feeds", "feeds.id", "feed_videos.feed_id")
    .innerJoin("feed_summaries", "feed_summaries.id", "feed_videos.summary_id")
    .where("feeds.user_id", "=", userId)
    .where("feed_videos.status", "=", "completed")
    .orderBy("feed_videos.created_at", "desc")
    .limit(6)
    .select([
      "feed_videos.id as video_id",
      "feed_videos.video_url",
      "feed_videos.thumbnail_url",
      "feed_videos.created_at as video_created_at",
      "feed_summaries.title",
      "feeds.id as feed_id",
      "feeds.name as feed_name",
    ])
    .execute()

  const videoCount = await db
    .selectFrom("feed_videos")
    .innerJoin("feeds", "feeds.id", "feed_videos.feed_id")
    .where("feeds.user_id", "=", userId)
    .where("feed_videos.status", "=", "completed")
    .select(db.fn.countAll<number>().as("count"))
    .executeTakeFirst()

  const pendingVideos = await db
    .selectFrom("feed_videos")
    .innerJoin("feeds", "feeds.id", "feed_videos.feed_id")
    .where("feeds.user_id", "=", userId)
    .where("feed_videos.status", "in", ["pending", "generating"])
    .select(db.fn.countAll<number>().as("count"))
    .executeTakeFirst()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/feeds"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          Manage Feeds
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Feeds</p>
          <p className="text-2xl font-bold mt-1">{feeds.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Videos</p>
          <p className="text-2xl font-bold mt-1">{Number(videoCount?.count || 0)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Generating</p>
          <p className="text-2xl font-bold mt-1">{Number(pendingVideos?.count || 0)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Public Feeds</p>
          <p className="text-2xl font-bold mt-1">{feeds.filter((f) => f.is_public).length}</p>
        </div>
      </div>

      {feeds.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Your Feeds</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {feeds.map((feed) => (
              <Link
                key={feed.id}
                href={`/feeds/${feed.id}`}
                className="block rounded-lg border border-gray-200 p-4 hover:border-gray-400 transition-colors"
              >
                <h3 className="font-semibold">{feed.name}</h3>
                {feed.description && (
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">{feed.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span>{feed.video_provider || "d-id"}</span>
                  <span>{feed.timezone}</span>
                  <span>at {feed.summary_hour}:00</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Videos</h2>
        {recentVideos.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentVideos.map((video) => (
              <Link
                key={video.video_id}
                href={`/feeds/${video.feed_id}`}
                className="block rounded-lg border border-gray-200 overflow-hidden hover:border-gray-400 transition-colors"
              >
                <div className="aspect-video bg-gray-100">
                  {video.thumbnail_url && (
                    <img src={video.thumbnail_url} alt={video.title || ""} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm line-clamp-2">{video.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{video.feed_name}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No videos generated yet. Create a feed and add sources to get started.
          </p>
        )}
      </section>

      {feeds.length === 0 && (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Get Started</h2>
          <p className="text-gray-600 mb-4">
            Create your first feed, add some news sources, and we&apos;ll generate daily video summaries for you.
          </p>
          <Link
            href="/feeds"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Your First Feed
          </Link>
        </div>
      )}
    </div>
  )
}
