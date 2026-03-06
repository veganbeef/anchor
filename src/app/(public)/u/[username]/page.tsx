import { db } from "@/lib/db"
import { ProfileCard } from "@/components/profile/ProfileCard"
import { FeedCard } from "@/components/feeds/FeedCard"
import { notFound } from "next/navigation"

export const revalidate = 300

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  const user = await db
    .selectFrom("users")
    .where("username", "=", username)
    .selectAll()
    .executeTakeFirst()

  if (!user) notFound()

  const feeds = await db
    .selectFrom("feeds")
    .where("user_id", "=", user.id)
    .where("is_public", "=", true)
    .where("is_active", "=", true)
    .orderBy("created_at", "desc")
    .selectAll()
    .execute()

  const videoCount = await db
    .selectFrom("feed_videos")
    .innerJoin("feeds", "feeds.id", "feed_videos.feed_id")
    .where("feeds.user_id", "=", user.id)
    .where("feed_videos.status", "=", "completed")
    .select(db.fn.countAll<number>().as("count"))
    .executeTakeFirst()

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <ProfileCard
        displayName={user.display_name}
        username={user.username}
        avatarUrl={user.avatar_url}
        feedCount={feeds.length}
        videoCount={Number(videoCount?.count || 0)}
      />
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Feeds</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {feeds.map((feed) => (
            <FeedCard
              key={feed.id}
              id={feed.id}
              name={feed.name}
              description={feed.description}
              ownerUsername={user.username}
              subscriptionPriceUsd={String(feed.subscription_price_usd)}
              isPublic={feed.is_public}
            />
          ))}
        </div>
        {feeds.length === 0 && <p className="text-gray-500">No public feeds yet.</p>}
      </section>
    </main>
  )
}
