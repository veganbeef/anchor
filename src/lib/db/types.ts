import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

// ---------------------------------------------------------------------------
// Column-level helper types
// ---------------------------------------------------------------------------

/** Timestamp that is auto-set on INSERT and cannot be updated. */
type CreatedAt = ColumnType<Date, Date | string | undefined, never>;

/** Timestamp that is auto-set on INSERT and auto-updated. */
type UpdatedAt = ColumnType<Date, Date | string | undefined, Date | string>;

/** Nullable timestamp with no automatic default. */
type NullableTimestamp = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null
>;

// ---------------------------------------------------------------------------
// Table interfaces
// ---------------------------------------------------------------------------

/**
 * Core user identity. Supports Farcaster (FID), Google OAuth, and guest auth.
 * `is_admin` controls admin dashboard access (set for FID 1568).
 * Stripe fields cover both customer (subscriber) and Connect (creator) roles.
 */
export interface UsersTable {
  id: Generated<string>;
  fid: number | null;
  email: string | null;
  username: string;
  display_name: string;
  avatar_url: string | null;
  wallet_address: string | null;
  auth_method: string;
  is_admin: Generated<boolean>;
  stripe_customer_id: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: Generated<boolean>;
  merged_into_id: string | null;
  metadata: ColumnType<Record<string, unknown> | null, string | Record<string, unknown> | null | undefined, string | Record<string, unknown> | null>;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

/**
 * Global registry of content sources shared across all users.
 * `type`: 'email' | 'podcast' | 'twitter' | 'farcaster'.
 * `identifier` is unique per source (sender email, RSS URL, @handle, FID/channel).
 */
export interface SourcesTable {
  id: Generated<string>;
  type: string;
  name: string;
  identifier: string;
  description: string | null;
  image_url: string | null;
  config: ColumnType<Record<string, unknown> | null, string | Record<string, unknown> | null | undefined, string | Record<string, unknown> | null>;
  is_active: Generated<boolean>;
  last_fetched_at: NullableTimestamp;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

/**
 * User-configured feed collections. Each feed has a schedule
 * (`summary_hour` + `timezone`), video config, and optional monetization
 * (`subscription_price_usd`, `per_video_price_usd`).
 * `last_run_date` is the atomic once-per-day generation guard.
 */
export interface FeedsTable {
  id: Generated<string>;
  user_id: string;
  name: string;
  description: string | null;
  summary_hour: Generated<number>;
  timezone: Generated<string>;
  last_run_date: string | null;
  video_enabled: Generated<boolean>;
  video_provider: string | null;
  video_config: ColumnType<Record<string, unknown> | null, string | Record<string, unknown> | null | undefined, string | Record<string, unknown> | null>;
  is_public: Generated<boolean>;
  subscription_price_usd: ColumnType<string | null, string | number | null | undefined, string | number | null>;
  per_video_price_usd: ColumnType<string | null, string | number | null | undefined, string | number | null>;
  is_active: Generated<boolean>;
  metadata: ColumnType<Record<string, unknown> | null, string | Record<string, unknown> | null | undefined, string | Record<string, unknown> | null>;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

/**
 * Many-to-many join between feeds and sources.
 * `priority` controls content ranking in summaries. Private to feed owner.
 */
export interface FeedSourcesTable {
  id: Generated<string>;
  feed_id: string;
  source_id: string;
  priority: Generated<number>;
  created_at: CreatedAt;
}

/**
 * Unified ingested content from all source types.
 * Status lifecycle: pending -> processing -> ready -> (consumed by summarizer).
 * Deduped on (source_id, external_id). Retained 90 days, then cleaned up.
 */
export interface ContentItemsTable {
  id: Generated<string>;
  source_id: string;
  external_id: string;
  title: string | null;
  body: string | null;
  url: string | null;
  author_name: string | null;
  author_handle: string | null;
  status: Generated<string>;
  ai_summary: string | null;
  published_at: ColumnType<Date, Date | string, Date | string>;
  metadata: ColumnType<Record<string, unknown> | null, string | Record<string, unknown> | null | undefined, string | Record<string, unknown> | null>;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

/**
 * AI-generated daily summaries with optional news anchor script.
 * `content_item_ids` is a denormalized snapshot (not live FK) -- summaries
 * are self-contained with inline citations. Old content items can be deleted
 * without affecting summaries.
 */
export interface FeedSummariesTable {
  id: Generated<string>;
  feed_id: string;
  title: string;
  summary: string;
  script: string | null;
  content_item_ids: ColumnType<string[], string | string[], string | string[]>;
  period_start: ColumnType<Date, Date | string, Date | string>;
  period_end: ColumnType<Date, Date | string, Date | string>;
  metadata: ColumnType<Record<string, unknown> | null, string | Record<string, unknown> | null | undefined, string | Record<string, unknown> | null>;
  generated_at: ColumnType<Date, Date | string | undefined, Date | string>;
  created_at: CreatedAt;
}

/**
 * Video generation tracking. Status: pending -> generating -> completed/failed.
 * Retry policy: up to `max_retries` with exponential backoff.
 * `video_url` stores persistent Vercel Blob URL (not provider CDN which expires).
 */
export interface FeedVideosTable {
  id: Generated<string>;
  summary_id: string;
  feed_id: string;
  provider: string;
  status: Generated<string>;
  external_job_id: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  retry_count: Generated<number>;
  max_retries: Generated<number>;
  config: ColumnType<Record<string, unknown> | null, string | Record<string, unknown> | null | undefined, string | Record<string, unknown> | null>;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

/**
 * User->platform subscriptions ($10/mo per feed for video generation).
 * Synced from Stripe webhooks.
 */
export interface PlatformSubscriptionsTable {
  id: Generated<string>;
  user_id: string;
  feed_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  current_period_start: NullableTimestamp;
  current_period_end: NullableTimestamp;
  price_usd: ColumnType<string, string | number, string | number>;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

/**
 * User->user subscriptions for paid feed access via Stripe Connect.
 * Platform takes 5% application fee. Partial unique index prevents
 * duplicate active subscriptions.
 */
export interface UserSubscriptionsTable {
  id: Generated<string>;
  subscriber_id: string;
  creator_id: string;
  feed_id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_start: NullableTimestamp;
  current_period_end: NullableTimestamp;
  price_usd: ColumnType<string, string | number, string | number>;
  created_at: CreatedAt;
  updated_at: UpdatedAt;
}

/**
 * Payment ledger mirroring Stripe events. Three types:
 * platform_subscription, user_subscription, video_purchase.
 * Supports refunds (admin-initiated).
 */
export interface PaymentsTable {
  id: Generated<string>;
  type: string;
  payer_id: string;
  recipient_id: string | null;
  feed_id: string | null;
  video_id: string | null;
  amount_usd: ColumnType<string, string | number, string | number>;
  platform_fee_usd: ColumnType<string | null, string | number | null | undefined, string | number | null>;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  status: string;
  refunded_at: NullableTimestamp;
  refund_reason: string | null;
  created_at: CreatedAt;
}

/** Tracks one-time video access grants. Deleted on refund to revoke access. */
export interface VideoPurchasesTable {
  id: Generated<string>;
  user_id: string;
  video_id: string;
  payment_id: string;
  created_at: CreatedAt;
}

/** Admin-curated homepage feeds. `sort_order` controls display position. */
export interface PinnedFeedsTable {
  id: Generated<string>;
  feed_id: string;
  sort_order: Generated<number>;
  pinned_by: string;
  created_at: CreatedAt;
}

/** Webhook idempotency tracking -- prevents duplicate processing of Stripe events. */
export interface StripeEventsTable {
  id: Generated<string>;
  stripe_event_id: string;
  event_type: string;
  processed_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

/** In-app notifications for video readiness, subscription reminders, etc. */
export interface NotificationsTable {
  id: Generated<string>;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  feed_id: string | null;
  is_read: Generated<boolean>;
  created_at: CreatedAt;
}

// ---------------------------------------------------------------------------
// NextAuth adapter tables (managed by @auth/kysely-adapter)
// ---------------------------------------------------------------------------

/** NextAuth OAuth account linkage. */
export interface AccountsTable {
  id: Generated<string>;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}

/** NextAuth session store. */
export interface SessionsTable {
  id: Generated<string>;
  userId: string;
  sessionToken: string;
  expires: ColumnType<Date, Date | string, Date | string>;
}

/** NextAuth email/magic-link verification tokens. */
export interface VerificationTokensTable {
  identifier: string;
  token: string;
  expires: ColumnType<Date, Date | string, Date | string>;
}

// ---------------------------------------------------------------------------
// Database interface
// ---------------------------------------------------------------------------

export interface DB {
  users: UsersTable;
  sources: SourcesTable;
  feeds: FeedsTable;
  feed_sources: FeedSourcesTable;
  content_items: ContentItemsTable;
  feed_summaries: FeedSummariesTable;
  feed_videos: FeedVideosTable;
  platform_subscriptions: PlatformSubscriptionsTable;
  user_subscriptions: UserSubscriptionsTable;
  payments: PaymentsTable;
  video_purchases: VideoPurchasesTable;
  pinned_feeds: PinnedFeedsTable;
  stripe_events: StripeEventsTable;
  notifications: NotificationsTable;
  accounts: AccountsTable;
  sessions: SessionsTable;
  verification_tokens: VerificationTokensTable;
}

// ---------------------------------------------------------------------------
// Convenience row types  (Select / Insert / Update)
// ---------------------------------------------------------------------------

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export type Source = Selectable<SourcesTable>;
export type NewSource = Insertable<SourcesTable>;
export type SourceUpdate = Updateable<SourcesTable>;

export type Feed = Selectable<FeedsTable>;
export type NewFeed = Insertable<FeedsTable>;
export type FeedUpdate = Updateable<FeedsTable>;

export type FeedSource = Selectable<FeedSourcesTable>;
export type NewFeedSource = Insertable<FeedSourcesTable>;

export type ContentItem = Selectable<ContentItemsTable>;
export type NewContentItem = Insertable<ContentItemsTable>;
export type ContentItemUpdate = Updateable<ContentItemsTable>;

export type FeedSummary = Selectable<FeedSummariesTable>;
export type NewFeedSummary = Insertable<FeedSummariesTable>;

export type FeedVideo = Selectable<FeedVideosTable>;
export type NewFeedVideo = Insertable<FeedVideosTable>;
export type FeedVideoUpdate = Updateable<FeedVideosTable>;

export type PlatformSubscription = Selectable<PlatformSubscriptionsTable>;
export type NewPlatformSubscription = Insertable<PlatformSubscriptionsTable>;
export type PlatformSubscriptionUpdate = Updateable<PlatformSubscriptionsTable>;

export type UserSubscription = Selectable<UserSubscriptionsTable>;
export type NewUserSubscription = Insertable<UserSubscriptionsTable>;
export type UserSubscriptionUpdate = Updateable<UserSubscriptionsTable>;

export type Payment = Selectable<PaymentsTable>;
export type NewPayment = Insertable<PaymentsTable>;

export type VideoPurchase = Selectable<VideoPurchasesTable>;
export type NewVideoPurchase = Insertable<VideoPurchasesTable>;

export type PinnedFeed = Selectable<PinnedFeedsTable>;
export type NewPinnedFeed = Insertable<PinnedFeedsTable>;

export type StripeEvent = Selectable<StripeEventsTable>;
export type NewStripeEvent = Insertable<StripeEventsTable>;

export type Notification = Selectable<NotificationsTable>;
export type NewNotification = Insertable<NotificationsTable>;

export type Account = Selectable<AccountsTable>;
export type NewAccount = Insertable<AccountsTable>;

export type Session = Selectable<SessionsTable>;
export type NewSession = Insertable<SessionsTable>;

export type VerificationToken = Selectable<VerificationTokensTable>;
export type NewVerificationToken = Insertable<VerificationTokensTable>;
