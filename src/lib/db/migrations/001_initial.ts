import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // -----------------------------------------------------------------------
  // Enable pgcrypto for gen_random_uuid() on older PG versions (harmless
  // on PG 13+ where it is built-in).
  // -----------------------------------------------------------------------
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`.execute(db);

  // -----------------------------------------------------------------------
  // users
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("fid", "integer")
    .addColumn("email", "varchar(255)")
    .addColumn("username", "varchar(255)")
    .addColumn("display_name", "varchar(255)")
    .addColumn("avatar_url", "text")
    .addColumn("wallet_address", "varchar(255)")
    .addColumn("auth_method", "varchar(50)", (col) => col.notNull())
    .addColumn("is_admin", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("stripe_customer_id", "varchar(255)")
    .addColumn("stripe_account_id", "varchar(255)")
    .addColumn("stripe_onboarding_complete", "boolean", (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn("metadata", "jsonb")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // -----------------------------------------------------------------------
  // sources
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("sources")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("type", "varchar(50)", (col) => col.notNull())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("identifier", "varchar(255)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("image_url", "text")
    .addColumn("config", "jsonb")
    .addColumn("is_active", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("last_fetched_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // -----------------------------------------------------------------------
  // feeds
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("feeds")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("summary_hour", "integer", (col) =>
      col.notNull().defaultTo(9),
    )
    .addColumn("timezone", "varchar(100)", (col) =>
      col.notNull().defaultTo("America/New_York"),
    )
    .addColumn("last_run_date", "date")
    .addColumn("video_enabled", "boolean", (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn("video_provider", "varchar(50)")
    .addColumn("video_config", "jsonb")
    .addColumn("is_public", "boolean", (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn("subscription_price_usd", sql`numeric(10,2)`)
    .addColumn("per_video_price_usd", sql`numeric(10,2)`)
    .addColumn("is_active", "boolean", (col) =>
      col.notNull().defaultTo(true),
    )
    .addColumn("metadata", "jsonb")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("idx_feeds_user")
    .on("feeds")
    .column("user_id")
    .execute();

  await sql`CREATE INDEX idx_feeds_public_active ON feeds (id) WHERE is_public = true AND is_active = true`.execute(
    db,
  );

  // -----------------------------------------------------------------------
  // feed_sources
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("feed_sources")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("feed_id", "uuid", (col) =>
      col.notNull().references("feeds.id").onDelete("cascade"),
    )
    .addColumn("source_id", "uuid", (col) =>
      col.notNull().references("sources.id").onDelete("cascade"),
    )
    .addColumn("priority", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint("uq_feed_sources_feed_source", [
      "feed_id",
      "source_id",
    ])
    .execute();

  // -----------------------------------------------------------------------
  // content_items
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("content_items")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("source_id", "uuid", (col) =>
      col.notNull().references("sources.id").onDelete("cascade"),
    )
    .addColumn("external_id", "varchar(500)", (col) => col.notNull())
    .addColumn("title", "text")
    .addColumn("body", "text")
    .addColumn("url", "text")
    .addColumn("author_name", "varchar(255)")
    .addColumn("author_handle", "varchar(255)")
    .addColumn("status", "varchar(50)", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("ai_summary", "text")
    .addColumn("published_at", "timestamptz")
    .addColumn("metadata", "jsonb")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint("uq_content_items_source_external", [
      "source_id",
      "external_id",
    ])
    .execute();

  await db.schema
    .createIndex("idx_content_items_source_published")
    .on("content_items")
    .columns(["source_id", "published_at"])
    .execute();

  await db.schema
    .createIndex("idx_content_items_status")
    .on("content_items")
    .column("status")
    .execute();

  // -----------------------------------------------------------------------
  // feed_summaries
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("feed_summaries")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("feed_id", "uuid", (col) =>
      col.notNull().references("feeds.id").onDelete("cascade"),
    )
    .addColumn("title", "text")
    .addColumn("summary", "text", (col) => col.notNull())
    .addColumn("script", "text")
    .addColumn("content_item_ids", "jsonb", (col) =>
      col.notNull().defaultTo(sql`'[]'::jsonb`),
    )
    .addColumn("period_start", "timestamptz", (col) => col.notNull())
    .addColumn("period_end", "timestamptz", (col) => col.notNull())
    .addColumn("metadata", "jsonb")
    .addColumn("generated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("idx_feed_summaries_feed_generated")
    .on("feed_summaries")
    .columns(["feed_id", "generated_at"])
    .execute();

  // -----------------------------------------------------------------------
  // feed_videos
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("feed_videos")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("summary_id", "uuid", (col) =>
      col.notNull().references("feed_summaries.id").onDelete("cascade"),
    )
    .addColumn("feed_id", "uuid", (col) =>
      col.notNull().references("feeds.id").onDelete("cascade"),
    )
    .addColumn("provider", "varchar(50)", (col) => col.notNull())
    .addColumn("status", "varchar(50)", (col) =>
      col.notNull().defaultTo("pending"),
    )
    .addColumn("external_job_id", "varchar(255)")
    .addColumn("video_url", "text")
    .addColumn("thumbnail_url", "text")
    .addColumn("duration_seconds", "integer")
    .addColumn("error_message", "text")
    .addColumn("retry_count", "integer", (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn("max_retries", "integer", (col) =>
      col.notNull().defaultTo(3),
    )
    .addColumn("config", "jsonb")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("idx_feed_videos_feed_status")
    .on("feed_videos")
    .columns(["feed_id", "status"])
    .execute();

  // -----------------------------------------------------------------------
  // platform_subscriptions
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("platform_subscriptions")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("feed_id", "uuid", (col) =>
      col.notNull().references("feeds.id").onDelete("cascade"),
    )
    .addColumn("stripe_subscription_id", "varchar(255)")
    .addColumn("stripe_customer_id", "varchar(255)")
    .addColumn("status", "varchar(50)", (col) => col.notNull())
    .addColumn("current_period_start", "timestamptz")
    .addColumn("current_period_end", "timestamptz")
    .addColumn("price_usd", sql`numeric(10,2)`, (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // -----------------------------------------------------------------------
  // user_subscriptions
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("user_subscriptions")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("subscriber_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("creator_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("feed_id", "uuid", (col) =>
      col.notNull().references("feeds.id").onDelete("cascade"),
    )
    .addColumn("stripe_subscription_id", "varchar(255)")
    .addColumn("status", "varchar(50)", (col) => col.notNull())
    .addColumn("current_period_start", "timestamptz")
    .addColumn("current_period_end", "timestamptz")
    .addColumn("price_usd", sql`numeric(10,2)`, (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("idx_user_subs_subscriber_feed")
    .on("user_subscriptions")
    .columns(["subscriber_id", "feed_id"])
    .execute();

  await sql`CREATE UNIQUE INDEX uq_active_user_subscription ON user_subscriptions (subscriber_id, feed_id) WHERE status = 'active'`.execute(
    db,
  );

  // -----------------------------------------------------------------------
  // payments
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("payments")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("type", "varchar(50)", (col) => col.notNull())
    .addColumn("payer_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("recipient_id", "uuid", (col) =>
      col.references("users.id").onDelete("cascade"),
    )
    .addColumn("feed_id", "uuid", (col) =>
      col.references("feeds.id").onDelete("cascade"),
    )
    .addColumn("video_id", "uuid", (col) =>
      col.references("feed_videos.id").onDelete("cascade"),
    )
    .addColumn("amount_usd", sql`numeric(10,2)`, (col) => col.notNull())
    .addColumn("platform_fee_usd", sql`numeric(10,2)`)
    .addColumn("payment_method", "varchar(50)")
    .addColumn("stripe_payment_intent_id", "varchar(255)")
    .addColumn("status", "varchar(50)", (col) => col.notNull())
    .addColumn("refunded_at", "timestamptz")
    .addColumn("refund_reason", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("idx_payments_payer")
    .on("payments")
    .column("payer_id")
    .execute();

  await db.schema
    .createIndex("idx_payments_recipient")
    .on("payments")
    .column("recipient_id")
    .execute();

  // -----------------------------------------------------------------------
  // video_purchases
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("video_purchases")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("video_id", "uuid", (col) =>
      col.notNull().references("feed_videos.id").onDelete("cascade"),
    )
    .addColumn("payment_id", "uuid", (col) =>
      col.notNull().references("payments.id").onDelete("cascade"),
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint("uq_video_purchases_user_video", [
      "user_id",
      "video_id",
    ])
    .execute();

  // -----------------------------------------------------------------------
  // pinned_feeds
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("pinned_feeds")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("feed_id", "uuid", (col) =>
      col.notNull().references("feeds.id").onDelete("cascade"),
    )
    .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("pinned_by", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // -----------------------------------------------------------------------
  // stripe_events
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("stripe_events")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("stripe_event_id", "varchar(255)", (col) =>
      col.notNull().unique(),
    )
    .addColumn("event_type", "varchar(255)", (col) => col.notNull())
    .addColumn("processed_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // -----------------------------------------------------------------------
  // NextAuth adapter tables: accounts, sessions, verification_tokens
  // -----------------------------------------------------------------------
  await db.schema
    .createTable("accounts")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("userId", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("type", "varchar(255)", (col) => col.notNull())
    .addColumn("provider", "varchar(255)", (col) => col.notNull())
    .addColumn("providerAccountId", "varchar(255)", (col) => col.notNull())
    .addColumn("refresh_token", "text")
    .addColumn("access_token", "text")
    .addColumn("expires_at", "integer")
    .addColumn("token_type", "varchar(255)")
    .addColumn("scope", "varchar(255)")
    .addColumn("id_token", "text")
    .addColumn("session_state", "varchar(255)")
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("userId", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("sessionToken", "varchar(255)", (col) =>
      col.notNull().unique(),
    )
    .addColumn("expires", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("verification_tokens")
    .addColumn("identifier", "varchar(255)", (col) => col.notNull())
    .addColumn("token", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("expires", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_verification_tokens_token")
    .on("verification_tokens")
    .column("token")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Drop in reverse dependency order
  await db.schema.dropTable("verification_tokens").ifExists().execute();
  await db.schema.dropTable("sessions").ifExists().execute();
  await db.schema.dropTable("accounts").ifExists().execute();
  await db.schema.dropTable("stripe_events").ifExists().execute();
  await db.schema.dropTable("pinned_feeds").ifExists().execute();
  await db.schema.dropTable("video_purchases").ifExists().execute();
  await db.schema.dropTable("payments").ifExists().execute();
  await db.schema.dropTable("user_subscriptions").ifExists().execute();
  await db.schema.dropTable("platform_subscriptions").ifExists().execute();
  await db.schema.dropTable("feed_videos").ifExists().execute();
  await db.schema.dropTable("feed_summaries").ifExists().execute();
  await db.schema.dropTable("content_items").ifExists().execute();
  await db.schema.dropTable("feed_sources").ifExists().execute();
  await db.schema.dropTable("feeds").ifExists().execute();
  await db.schema.dropTable("sources").ifExists().execute();
  await db.schema.dropTable("users").ifExists().execute();
}
