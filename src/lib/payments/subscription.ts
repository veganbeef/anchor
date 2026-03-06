/**
 * Feed access control logic — determines if a user can view a feed's content.
 *
 * Access hierarchy: free feeds -> feed owner -> active subscription -> payment required.
 *
 * - checkFeedAccess: Returns { hasAccess, reason } for feed-level access.
 * - checkVideoAccess: Extends feed access check with per-video purchase fallback.
 */
import { db } from "@/lib/db"

export async function checkFeedAccess(userId: string | null, feedId: string): Promise<{ hasAccess: boolean; reason: string }> {
  const feed = await db
    .selectFrom("feeds")
    .where("id", "=", feedId)
    .select(["subscription_price_usd", "per_video_price_usd", "user_id", "is_public"])
    .executeTakeFirstOrThrow()

  // Free feeds are accessible to everyone
  if (Number(feed.subscription_price_usd) === 0 && Number(feed.per_video_price_usd) === 0) {
    return { hasAccess: true, reason: "free" }
  }

  // Feed owner always has access
  if (userId && feed.user_id === userId) {
    return { hasAccess: true, reason: "owner" }
  }

  if (!userId) {
    return { hasAccess: false, reason: "auth_required" }
  }

  // Check active subscription
  if (Number(feed.subscription_price_usd) > 0) {
    const subscription = await db
      .selectFrom("user_subscriptions")
      .where("subscriber_id", "=", userId)
      .where("feed_id", "=", feedId)
      .where("status", "=", "active")
      .executeTakeFirst()

    if (subscription) {
      return { hasAccess: true, reason: "subscription" }
    }
  }

  return { hasAccess: false, reason: "payment_required" }
}

export async function checkVideoAccess(userId: string | null, videoId: string, feedId: string): Promise<boolean> {
  const feedAccess = await checkFeedAccess(userId, feedId)
  if (feedAccess.hasAccess) return true

  if (!userId) return false

  // Check per-video purchase
  const purchase = await db
    .selectFrom("video_purchases")
    .where("user_id", "=", userId)
    .where("video_id", "=", videoId)
    .executeTakeFirst()

  return !!purchase
}
