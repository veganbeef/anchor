import { type Kysely, sql } from "kysely";

/**
 * Migration 002: Fix schema deviations from architecture spec.
 *
 * - Add missing UNIQUE constraints
 * - Fix default values
 * - Add NOT NULL constraints where spec requires them
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // -----------------------------------------------------------------------
  // users: add UNIQUE constraints on fid, email, username, stripe IDs
  // -----------------------------------------------------------------------
  await sql`ALTER TABLE users ADD CONSTRAINT uq_users_fid UNIQUE (fid)`.execute(db);
  await sql`ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email)`.execute(db);
  await sql`ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username)`.execute(db);
  await sql`ALTER TABLE users ADD CONSTRAINT uq_users_stripe_customer_id UNIQUE (stripe_customer_id)`.execute(db);
  await sql`ALTER TABLE users ADD CONSTRAINT uq_users_stripe_account_id UNIQUE (stripe_account_id)`.execute(db);

  // users: set NOT NULL on username and display_name (fill blanks first)
  await sql`UPDATE users SET username = 'user-' || LEFT(id::text, 8) WHERE username IS NULL`.execute(db);
  await sql`UPDATE users SET display_name = COALESCE(username, 'User') WHERE display_name IS NULL`.execute(db);
  await sql`ALTER TABLE users ALTER COLUMN username SET NOT NULL`.execute(db);
  await sql`ALTER TABLE users ALTER COLUMN display_name SET NOT NULL`.execute(db);

  // -----------------------------------------------------------------------
  // sources: add UNIQUE constraint on identifier
  // -----------------------------------------------------------------------
  await sql`ALTER TABLE sources ADD CONSTRAINT uq_sources_identifier UNIQUE (identifier)`.execute(db);

  // -----------------------------------------------------------------------
  // feeds: fix default values to match spec
  // -----------------------------------------------------------------------
  await sql`ALTER TABLE feeds ALTER COLUMN timezone SET DEFAULT 'America/Los_Angeles'`.execute(db);
  await sql`ALTER TABLE feeds ALTER COLUMN video_enabled SET DEFAULT true`.execute(db);
  await sql`ALTER TABLE feeds ALTER COLUMN video_provider SET DEFAULT 'a2e'`.execute(db);
  await sql`ALTER TABLE feeds ALTER COLUMN is_public SET DEFAULT true`.execute(db);
  await sql`ALTER TABLE feeds ALTER COLUMN subscription_price_usd SET DEFAULT 0`.execute(db);
  await sql`ALTER TABLE feeds ALTER COLUMN per_video_price_usd SET DEFAULT 0`.execute(db);

  // -----------------------------------------------------------------------
  // feed_sources: fix default priority to 1 (spec says default 1)
  // -----------------------------------------------------------------------
  await sql`ALTER TABLE feed_sources ALTER COLUMN priority SET DEFAULT 1`.execute(db);

  // -----------------------------------------------------------------------
  // content_items: published_at should be NOT NULL per spec
  // -----------------------------------------------------------------------
  await sql`UPDATE content_items SET published_at = created_at WHERE published_at IS NULL`.execute(db);
  await sql`ALTER TABLE content_items ALTER COLUMN published_at SET NOT NULL`.execute(db);

  // -----------------------------------------------------------------------
  // feed_summaries: title should be NOT NULL per spec
  // -----------------------------------------------------------------------
  await sql`UPDATE feed_summaries SET title = 'Untitled' WHERE title IS NULL`.execute(db);
  await sql`ALTER TABLE feed_summaries ALTER COLUMN title SET NOT NULL`.execute(db);

  // -----------------------------------------------------------------------
  // platform_subscriptions: add UNIQUE constraints
  // -----------------------------------------------------------------------
  await sql`ALTER TABLE platform_subscriptions ADD CONSTRAINT uq_platform_subs_stripe_id UNIQUE (stripe_subscription_id)`.execute(db);
  await sql`ALTER TABLE platform_subscriptions ALTER COLUMN stripe_subscription_id SET NOT NULL`.execute(db);
  await sql`ALTER TABLE platform_subscriptions ALTER COLUMN stripe_customer_id SET NOT NULL`.execute(db);
  await sql`ALTER TABLE platform_subscriptions ADD CONSTRAINT uq_platform_subs_user_feed UNIQUE (user_id, feed_id)`.execute(db);

  // -----------------------------------------------------------------------
  // user_subscriptions: add UNIQUE constraint on stripe_subscription_id
  // -----------------------------------------------------------------------
  await sql`ALTER TABLE user_subscriptions ADD CONSTRAINT uq_user_subs_stripe_id UNIQUE (stripe_subscription_id)`.execute(db);
  await sql`ALTER TABLE user_subscriptions ALTER COLUMN stripe_subscription_id SET NOT NULL`.execute(db);

  // -----------------------------------------------------------------------
  // pinned_feeds: add UNIQUE constraint on feed_id (one pin per feed)
  // -----------------------------------------------------------------------
  await sql`ALTER TABLE pinned_feeds ADD CONSTRAINT uq_pinned_feeds_feed UNIQUE (feed_id)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Remove UNIQUE constraints
  await sql`ALTER TABLE pinned_feeds DROP CONSTRAINT IF EXISTS uq_pinned_feeds_feed`.execute(db);
  await sql`ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS uq_user_subs_stripe_id`.execute(db);
  await sql`ALTER TABLE user_subscriptions ALTER COLUMN stripe_subscription_id DROP NOT NULL`.execute(db);
  await sql`ALTER TABLE platform_subscriptions DROP CONSTRAINT IF EXISTS uq_platform_subs_user_feed`.execute(db);
  await sql`ALTER TABLE platform_subscriptions DROP CONSTRAINT IF EXISTS uq_platform_subs_stripe_id`.execute(db);
  await sql`ALTER TABLE platform_subscriptions ALTER COLUMN stripe_subscription_id DROP NOT NULL`.execute(db);
  await sql`ALTER TABLE platform_subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL`.execute(db);

  await sql`ALTER TABLE feed_summaries ALTER COLUMN title DROP NOT NULL`.execute(db);
  await sql`ALTER TABLE content_items ALTER COLUMN published_at DROP NOT NULL`.execute(db);

  await sql`ALTER TABLE feed_sources ALTER COLUMN priority SET DEFAULT 0`.execute(db);

  await sql`ALTER TABLE feeds ALTER COLUMN subscription_price_usd DROP DEFAULT`.execute(db);
  await sql`ALTER TABLE feeds ALTER COLUMN per_video_price_usd DROP DEFAULT`.execute(db);
  await sql`ALTER TABLE feeds ALTER COLUMN is_public SET DEFAULT false`.execute(db);
  await sql`ALTER TABLE feeds ALTER COLUMN video_provider DROP DEFAULT`.execute(db);
  await sql`ALTER TABLE feeds ALTER COLUMN video_enabled SET DEFAULT false`.execute(db);
  await sql`ALTER TABLE feeds ALTER COLUMN timezone SET DEFAULT 'America/New_York'`.execute(db);

  await sql`ALTER TABLE sources DROP CONSTRAINT IF EXISTS uq_sources_identifier`.execute(db);

  await sql`ALTER TABLE users ALTER COLUMN display_name DROP NOT NULL`.execute(db);
  await sql`ALTER TABLE users ALTER COLUMN username DROP NOT NULL`.execute(db);
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_stripe_account_id`.execute(db);
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_stripe_customer_id`.execute(db);
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_username`.execute(db);
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_email`.execute(db);
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_fid`.execute(db);
}
