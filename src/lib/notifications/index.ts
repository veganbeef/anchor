import { db } from "@/lib/db"

export type NotificationType = "video_ready" | "subscription_reminder" | "subscription_expiring"

/**
 * Creates an in-app notification and optionally sends a Farcaster push.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  feedId?: string,
) {
  await db
    .insertInto("notifications")
    .values({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      feed_id: feedId ?? null,
    })
    .execute()

  // Optionally send Farcaster push notification
  if (process.env.NEYNAR_API_KEY) {
    try {
      const user = await db
        .selectFrom("users")
        .where("id", "=", userId)
        .select(["fid"])
        .executeTakeFirst()

      if (user?.fid) {
        await fetch("https://api.neynar.com/v2/farcaster/notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            api_key: process.env.NEYNAR_API_KEY,
          },
          body: JSON.stringify({
            target_fids: [user.fid],
            title,
            body: body || title,
          }),
        })
      }
    } catch {
      // Farcaster push is best-effort, don't fail the notification
    }
  }
}
