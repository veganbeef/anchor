import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { VideoPlayer } from "@/components/video/VideoPlayer"
import { GenerateButton } from "./generate-button"

export default async function FeedDetailPage({ params }: { params: Promise<{ feedId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const { feedId } = await params

  const feed = await db
    .selectFrom("feeds")
    .where("id", "=", feedId)
    .where("user_id", "=", session.user.id)
    .selectAll()
    .executeTakeFirst()

  if (!feed) notFound()

  const sourceCount = await db
    .selectFrom("feed_sources")
    .where("feed_id", "=", feedId)
    .select(db.fn.countAll<number>().as("count"))
    .executeTakeFirst()

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

  const pendingVideo = await db
    .selectFrom("feed_videos")
    .where("feed_id", "=", feedId)
    .where("status", "in", ["pending", "generating"])
    .orderBy("created_at", "desc")
    .selectAll()
    .executeTakeFirst()

  const summaries = await db
    .selectFrom("feed_summaries")
    .where("feed_id", "=", feedId)
    .orderBy("generated_at", "desc")
    .limit(10)
    .selectAll()
    .execute()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{feed.name}</h1>
          {feed.description && <p className="text-gray-600 mt-1">{feed.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <GenerateButton feedId={feedId} />
          <Link
            href={`/feeds/${feedId}/settings`}
            className="text-sm text-gray-500 hover:text-blue-600 border border-gray-300 px-3 py-2 rounded-lg"
          >
            Settings
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-sm">
        <div className="rounded border border-gray-200 p-3">
          <p className="text-gray-500">Sources</p>
          <p className="font-semibold">{Number(sourceCount?.count || 0)}</p>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <p className="text-gray-500">Schedule</p>
          <p className="font-semibold">{feed.summary_hour}:00 {feed.timezone}</p>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <p className="text-gray-500">Video Provider</p>
          <p className="font-semibold uppercase">{feed.video_provider || "d-id"}</p>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <p className="text-gray-500">Visibility</p>
          <p className="font-semibold">{feed.is_public ? "Public" : "Private"}</p>
        </div>
      </div>

      {pendingVideo && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-yellow-800 text-sm">
            Video is currently being generated ({pendingVideo.status})...
          </p>
        </div>
      )}

      {latestVideo?.video_url && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Latest Video</h2>
          <VideoPlayer
            videoUrl={latestVideo.video_url}
            thumbnailUrl={latestVideo.thumbnail_url}
            title={latestSummary?.title || undefined}
          />
        </section>
      )}

      {latestSummary && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Latest Summary</h2>
          <article className="rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-3">{latestSummary.title}</h3>
            <div className="whitespace-pre-wrap text-sm text-gray-700">
              {latestSummary.summary}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Generated {new Date(latestSummary.generated_at).toLocaleString()}
            </p>
          </article>
        </section>
      )}

      {summaries.length > 1 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Previous Summaries</h2>
          <div className="space-y-2">
            {summaries.slice(1).map((summary) => (
              <div key={summary.id} className="rounded border border-gray-200 p-3">
                <p className="font-medium text-sm">{summary.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(summary.generated_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!latestSummary && !latestVideo && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-2">No content generated yet.</p>
          <p className="text-gray-500 text-sm">
            Add sources in{" "}
            <Link href={`/feeds/${feedId}/settings`} className="text-blue-600 hover:underline">
              feed settings
            </Link>{" "}
            and wait for the next scheduled run, or trigger generation manually.
          </p>
        </div>
      )}
    </div>
  )
}
