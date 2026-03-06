import { db } from "@/lib/db"

/**
 * Finds another user account with the same email that could be linked.
 */
export async function findLinkableAccount(email: string, currentUserId: string) {
  return db
    .selectFrom("users")
    .where("email", "=", email)
    .where("id", "!=", currentUserId)
    .where("merged_into_id", "is", null)
    .select(["id", "username", "auth_method", "email"])
    .executeTakeFirst()
}

/**
 * Merges a secondary account into the primary account.
 * Transfers all owned resources and marks secondary as merged.
 */
export async function mergeAccounts(primaryId: string, secondaryId: string) {
  await db.transaction().execute(async (trx) => {
    // Transfer feeds
    await trx
      .updateTable("feeds")
      .set({ user_id: primaryId })
      .where("user_id", "=", secondaryId)
      .execute()

    // Transfer user subscriptions (as subscriber)
    await trx
      .updateTable("user_subscriptions")
      .set({ subscriber_id: primaryId })
      .where("subscriber_id", "=", secondaryId)
      .execute()

    // Transfer user subscriptions (as creator)
    await trx
      .updateTable("user_subscriptions")
      .set({ creator_id: primaryId })
      .where("creator_id", "=", secondaryId)
      .execute()

    // Transfer payments (as payer)
    await trx
      .updateTable("payments")
      .set({ payer_id: primaryId })
      .where("payer_id", "=", secondaryId)
      .execute()

    // Transfer payments (as recipient)
    await trx
      .updateTable("payments")
      .set({ recipient_id: primaryId })
      .where("recipient_id", "=", secondaryId)
      .execute()

    // Transfer video purchases
    await trx
      .updateTable("video_purchases")
      .set({ user_id: primaryId })
      .where("user_id", "=", secondaryId)
      .execute()

    // Transfer platform subscriptions
    await trx
      .updateTable("platform_subscriptions")
      .set({ user_id: primaryId })
      .where("user_id", "=", secondaryId)
      .execute()

    // Mark secondary as merged
    await trx
      .updateTable("users")
      .set({ merged_into_id: primaryId })
      .where("id", "=", secondaryId)
      .execute()
  })
}
