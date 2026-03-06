# Anchor

Multi-source news aggregation platform with AI-generated video summaries. Deployed as both a web app and Farcaster Mini App.

**Core loop**: Users configure feeds (sets of news sources) → platform ingests content on a schedule → AI generates cited summaries → converts to news anchor scripts → avatar videos are generated → viewable on user profiles and homepage (free or paid).

**Business model**: Users pay the platform $10/mo per feed for video generation. Feed owners can charge subscribers for access (card or USDC via Stripe). Platform takes 5% of user-to-user transactions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  Web App      │  │  Farcaster   │  │  Admin        │                  │
│  │  (Next.js)    │  │  Mini App    │  │  Dashboard    │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
└─────────┼──────────────────┼──────────────────┼─────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS API LAYER                               │
│                                                                         │
│  Auth            Content           Payments          Admin              │
│  ├─ NextAuth     ├─ /feeds         ├─ /checkout      ├─ /admin/dash     │
│  ├─ Farcaster    ├─ /sources       ├─ /subscribe     ├─ /admin/users    │
│  │  Quick Auth   ├─ /summaries     ├─ /purchase      ├─ /admin/feeds    │
│  │               ├─ /videos        │                  ├─ /admin/refund   │
│  │               │                 │                  │                  │
│  Webhooks        Cron Triggers     Stripe Connect     Rate Limiting     │
│  ├─ Stripe       ├─ /cron/ingest   ├─ /connect       └─ Upstash        │
│  ├─ AssemblyAI   ├─ /cron/generate ├─ /account-status                   │
│  ├─ Video CDN    │                 │                                     │
│  │               │                 │                                     │
└───┼───────────────┼─────────────────┼───────────────────────────────────┘
    │               │                 │
    ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKGROUND PROCESSING (Inngest)                    │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  ingest-sources   │  │  generate-feed   │  │  cleanup-content │       │
│  │  (every 4h)       │  │  -summary        │  │  (weekly)        │       │
│  │                   │  │  (per-feed)      │  │                  │       │
│  │  Email (Resend)   │  │                  │  │  Deletes items   │       │
│  │  Twitter          │  │  1. Guard (1/day)│  │  older than 90d  │       │
│  │  Farcaster        │  │  2. Summarize    │  │                  │       │
│  │  Podcasts         │  │  3. Script       │  └──────────────────┘       │
│  │                   │  │  4. Video submit │                             │
│  └──────────────────┘  │  5. Wait webhook │  ┌──────────────────┐       │
│                         │  6. Persist video│  │  generate-all    │       │
│                         │                  │  │  -summaries      │       │
│                         └──────────────────┘  │  (hourly fan-out)│       │
│                                               └──────────────────┘       │
└───┼───────────────────────────┼─────────────────────────────────────────┘
    │                           │
    ▼                           ▼
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│   AI Providers     │  │  Video Providers   │  │   External APIs    │
│                    │  │                    │  │                    │
│  Gemini (default)  │  │  D-ID (default)    │  │  Stripe            │
│  OpenAI            │  │  A2E               │  │  Resend            │
│  Anthropic         │  │  HeyGen            │  │  AssemblyAI        │
│  DeepSeek          │  │  Synthesia         │  │  Neynar            │
│                    │  │                    │  │  SocialData        │
└────────────────────┘  └────────────────────┘  └────────────────────┘
    │                           │
    ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                    │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Neon PostgreSQL  │  │  Vercel Blob     │  │  Vercel KV       │       │
│  │  (Kysely ORM)     │  │  (video storage) │  │  (rate limits)   │       │
│  │                   │  │                  │  │                  │       │
│  │  users            │  │  Persistent URLs │  │  Upstash Redis   │       │
│  │  feeds            │  │  for generated   │  │                  │       │
│  │  sources          │  │  videos          │  │                  │       │
│  │  content_items    │  │                  │  │                  │       │
│  │  feed_summaries   │  │                  │  │                  │       │
│  │  feed_videos      │  │                  │  │                  │       │
│  │  subscriptions    │  │                  │  │                  │       │
│  │  payments         │  │                  │  │                  │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                         │
│  Observability: Sentry (errors) · Axiom (structured logs)               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Sources (email, twitter, farcaster, podcasts)
    │
    ▼  ingest-sources (every 4 hours)
content_items table
    │
    ▼  generate-feed-summary (once per day per feed, at configured hour + timezone)
    │
    ├──▶ AI Summarizer ──▶ feed_summaries table
    │
    ├──▶ AI Script Writer ──▶ script column
    │
    └──▶ Video Provider ──▶ wait for webhook ──▶ Vercel Blob ──▶ feed_videos table
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | Neon PostgreSQL (prod), local PostgreSQL via Docker (dev) |
| Query Builder | Kysely (type-safe SQL) |
| Auth | Farcaster Quick Auth (JWT) + NextAuth v5 (Google OAuth) |
| Payments | Stripe (Checkout, Billing, Connect) |
| AI — Summarization | Gemini 2.5 Flash (default), OpenAI, Anthropic, DeepSeek |
| AI — Script Writing | Gemini 2.5 Flash-Lite (default) |
| Video Generation | D-ID (default), A2E, HeyGen, Synthesia — strategy pattern |
| Video Storage | Vercel Blob |
| Job Orchestration | Inngest (step functions + waitForEvent) |
| Ingestion | Resend (email), AssemblyAI (podcasts), Neynar (Farcaster), SocialData (Twitter) |
| Rate Limiting | Upstash + Vercel KV |
| Observability | Sentry (errors), Axiom (structured logs) |
| Styling | Tailwind CSS v4 |
| Testing | Vitest, Testing Library, MSW |

## Project Structure

```
src/
├── app/
│   ├── (public)/                  # Unauthenticated pages
│   │   ├── page.tsx               #   Homepage (pinned feeds + public videos)
│   │   ├── feed/[feedId]/         #   Public feed view (paywalled if priced)
│   │   └── u/[username]/          #   Public user profile
│   ├── (app)/                     # Authenticated user pages
│   │   ├── dashboard/             #   Feed overview + stats
│   │   ├── feeds/[feedId]/        #   Feed detail + settings
│   │   ├── sources/               #   Browse + discover sources
│   │   ├── profile/               #   Edit profile
│   │   ├── settings/              #   Account settings
│   │   └── stripe/                #   Stripe Connect onboarding
│   ├── (admin)/admin/             # Admin dashboard (is_admin guard)
│   │   ├── users/                 #   User management
│   │   ├── feeds/                 #   Feed health
│   │   ├── payments/              #   Transaction ledger + refunds
│   │   └── services/              #   Ingestion + video queue health
│   └── api/
│       ├── auth/                  # NextAuth + Farcaster auth
│       ├── feeds/                 # Feed CRUD + sources + summaries + videos
│       ├── sources/               # Source CRUD + discover
│       ├── payments/              # Checkout, subscribe, purchase-video
│       ├── webhooks/              # Stripe, AssemblyAI, video providers
│       ├── cron/                  # Vercel cron → Inngest fan-out
│       └── inngest/               # Inngest serve endpoint
├── lib/
│   ├── ai/                        # AI provider factory + implementations
│   ├── auth/                      # Auth middleware, Farcaster JWT, admin guard
│   ├── db/                        # Kysely setup, types, migrations
│   ├── ingestion/                 # Email, Twitter, Farcaster, podcast ingestion
│   ├── observability/             # Sentry + Axiom logger
│   ├── payments/                  # Stripe, Connect, subscriptions, refunds
│   ├── processing/                # AI summarizer + script writer
│   ├── scheduling/                # Inngest functions
│   └── video/                     # Video provider factory + storage
├── components/
│   ├── admin/                     # Admin UI (charts, dialogs)
│   ├── feeds/                     # FeedCard, FeedList
│   ├── payments/                  # Paywall, subscribe/purchase buttons
│   ├── video/                     # VideoPlayer
│   └── providers/                 # AppProvider (context)
└── types/                         # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)

### Setup

```bash
# Install dependencies
npm install

# Start local PostgreSQL
docker compose up -d

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

See `.env.local.example` for the full list. The minimum required for local development:

```
DATABASE_URL=postgresql://anchor:anchor@localhost:5432/anchor
NEXTAUTH_SECRET=<any-random-string>
NEXTAUTH_URL=http://localhost:3000
CRON_SECRET=<any-random-string>
```

Optional keys enable additional features:

| Variable | Enables |
|---|---|
| `GOOGLE_AI_API_KEY` | AI summarization + script writing (Gemini) |
| `STRIPE_SECRET_KEY` | Payments |
| `RESEND_API_KEY` | Email source ingestion |
| `NEYNAR_API_KEY` | Farcaster source ingestion |
| `ASSEMBLYAI_API_KEY` | Podcast transcription |
| `DID_API_KEY` | Video generation (D-ID) |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking |
| `AXIOM_TOKEN` | Structured logging |
| `SOCIALDATA_API_KEY` | Twitter source ingestion (optional, off by default) |

## Scripts

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm run typecheck        # TypeScript type checking
npm run test             # Unit tests (Vitest)
npm run test:watch       # Unit tests in watch mode
npm run test:integration # Integration tests
npm run db:migrate       # Run database migrations
```

---

## Database Schema

Schema is managed through Kysely migrations in `src/lib/db/migrations/`. Types are defined in `src/lib/db/types.ts`.

### Dialect Switching

The Kysely client (`src/lib/db/index.ts`) auto-selects the database driver based on `DATABASE_URL`:

- **Production** (URL contains `neon.tech`): Uses `NeonDialect` with `@neondatabase/serverless` (HTTP-based, no persistent connections)
- **Local dev**: Uses `PostgresDialect` with `pg.Pool` (standard node-postgres)

### Tables

**`users`** — Core identity table

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Auto-generated |
| `fid` | integer UNIQUE nullable | Farcaster FID |
| `email` | text UNIQUE nullable | SSO email (Google OAuth) |
| `username` | text UNIQUE | URL-safe slug for `/u/[username]` profiles |
| `display_name` | text | Editable; defaults to FC username or Google name |
| `avatar_url` | text nullable | FC profile picture or null |
| `wallet_address` | text nullable | From Farcaster verified addresses (display only) |
| `auth_method` | text | `'farcaster'` \| `'google'` \| `'email'` \| `'guest'` |
| `is_admin` | boolean default false | Set true for FID 1568; admin guard uses this column |
| `stripe_customer_id` | text UNIQUE nullable | For subscribers making payments |
| `stripe_account_id` | text UNIQUE nullable | Stripe Connect account (for creators receiving payments) |
| `stripe_onboarding_complete` | boolean default false | True after Stripe Connect onboarding |
| `metadata` | jsonb | `{timezone, preferences}` |

**`sources`** — Global content source registry (shared across users)

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `type` | text | `'email'` \| `'podcast'` \| `'twitter'` \| `'farcaster'` |
| `name` | text | Human-readable source name |
| `identifier` | text UNIQUE | `sender@` \| `rss_url` \| `@handle` \| `fid/channel` |
| `config` | jsonb | Type-specific: `{feedUrl, fid, channelId}` |
| `is_active` | boolean default true | |
| `last_fetched_at` | timestamptz nullable | |

**`feeds`** — User-configured feed collections

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→users | Owner (CASCADE on delete) |
| `name` | text | |
| `summary_hour` | integer default 9 | 0-23 hour in user's timezone |
| `timezone` | text default `'America/Los_Angeles'` | IANA timezone |
| `last_run_date` | date nullable | Atomic once-per-day generation guard |
| `video_enabled` | boolean default true | |
| `video_provider` | text | `'d-id'` \| `'a2e'` \| `'heygen'` \| `'synthesia'` |
| `video_config` | jsonb | `{avatarId, voiceId, style}` |
| `is_public` | boolean default true | |
| `subscription_price_usd` | numeric(10,2) default 0 | 0 = free; >0 = monthly |
| `per_video_price_usd` | numeric(10,2) default 0 | 0 = free; >0 = per-video |
| `metadata` | jsonb | `{tone, maxLength, tags}` |

**`feed_sources`** — Many-to-many join (private to feed owner)

| Column | Type | Description |
|---|---|---|
| `feed_id` | uuid FK→feeds | |
| `source_id` | uuid FK→sources | |
| `priority` | integer default 1 | Higher = ranked first in summaries |
| | | UNIQUE(feed_id, source_id) |

**`content_items`** — Unified ingested content

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `source_id` | uuid FK→sources | |
| `external_id` | text | Source-specific unique ID |
| `title` | text nullable | |
| `body` | text nullable | Plain text (HTML stripped during ingestion) |
| `status` | text default `'pending'` | `'pending'` → `'processing'` → `'ready'` → `'failed'` |
| `published_at` | timestamptz | |
| `metadata` | jsonb | Engagement metrics, provider-specific data |
| | | UNIQUE(source_id, external_id) — deduplication key |

Retained for 90 days, then cleaned up by `cleanup-content` Inngest function. Summaries are self-contained (embed cited text), so old items can be safely deleted.

**`feed_summaries`** — AI-generated daily summaries

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `feed_id` | uuid FK→feeds | |
| `title` | text | |
| `summary` | text | Markdown with inline citations |
| `script` | text nullable | News anchor script for video |
| `content_item_ids` | jsonb | Denormalized snapshot of item IDs (not live FK) |
| `period_start` | timestamptz | |
| `period_end` | timestamptz | |
| `generated_at` | timestamptz | |

**`feed_videos`** — Video generation tracking

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `summary_id` | uuid FK→feed_summaries | |
| `feed_id` | uuid FK→feeds | |
| `provider` | text | `'d-id'` \| `'a2e'` etc. |
| `status` | text default `'pending'` | `'pending'` → `'generating'` → `'completed'` / `'failed'` |
| `external_job_id` | text nullable | Provider's job reference |
| `video_url` | text nullable | Persistent Vercel Blob URL |
| `retry_count` | integer default 0 | |
| `max_retries` | integer default 3 | |

**`platform_subscriptions`** — User→platform ($10/mo per feed)

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid FK→users | |
| `feed_id` | uuid FK→feeds | |
| `stripe_subscription_id` | text UNIQUE | |
| `status` | text | `'active'` \| `'past_due'` \| `'cancelled'` (synced from Stripe) |
| `price_usd` | numeric(10,2) default 10.00 | |
| | | UNIQUE(user_id, feed_id) |

**`user_subscriptions`** — User→user (via Stripe Connect, 5% platform fee)

| Column | Type | Description |
|---|---|---|
| `subscriber_id` | uuid FK→users | Who's paying |
| `creator_id` | uuid FK→users | Who's receiving |
| `feed_id` | uuid FK→feeds | |
| `stripe_subscription_id` | text UNIQUE | |
| `status` | text | Same as platform_subscriptions |
| `price_usd` | numeric(10,2) | Set by creator |
| | | Partial unique index: `UNIQUE(subscriber_id, feed_id) WHERE status = 'active'` |

**`payments`** — Ledger mirroring Stripe events

| Column | Type | Description |
|---|---|---|
| `type` | text | `'platform_subscription'` \| `'user_subscription'` \| `'video_purchase'` |
| `payer_id` | uuid FK→users | |
| `recipient_id` | uuid FK→users nullable | null for platform payments |
| `amount_usd` | numeric(10,2) | |
| `platform_fee_usd` | numeric(10,2) | 5% of user-to-user payments |
| `stripe_payment_intent_id` | text | |
| `status` | text | `'completed'` \| `'failed'` \| `'refunded'` |
| `refunded_at` | timestamptz nullable | |
| `refund_reason` | text nullable | Admin-provided |

**`video_purchases`** — One-time video access grants. UNIQUE(user_id, video_id). Deleted on refund to revoke access.

**`pinned_feeds`** — Admin-curated homepage feeds. `sort_order` controls display position. UNIQUE(feed_id).

**`stripe_events`** — Webhook idempotency. UNIQUE(stripe_event_id). Prevents duplicate processing of Stripe webhooks.

**`accounts`**, **`sessions`**, **`verification_tokens`** — NextAuth adapter tables managed by `@auth/kysely-adapter`.

### Indexes

```sql
-- content_items: summary gather query (most performance-critical)
CREATE INDEX idx_content_items_source_published ON content_items(source_id, published_at);
CREATE INDEX idx_content_items_status ON content_items(status);

-- feed_summaries: latest summary lookup
CREATE INDEX idx_feed_summaries_feed_generated ON feed_summaries(feed_id, generated_at DESC);

-- feed_videos: video listing
CREATE INDEX idx_feed_videos_feed_status ON feed_videos(feed_id, status);

-- user_subscriptions: access checks + active uniqueness
CREATE INDEX idx_user_subs_subscriber_feed ON user_subscriptions(subscriber_id, feed_id, status);
CREATE UNIQUE INDEX uq_active_user_subscription ON user_subscriptions(subscriber_id, feed_id) WHERE status = 'active';

-- feeds: dashboard + homepage
CREATE INDEX idx_feeds_user ON feeds(user_id);
CREATE INDEX idx_feeds_public_active ON feeds(is_public, is_active) WHERE is_public = true AND is_active = true;

-- payments: ledger queries
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_recipient ON payments(recipient_id);
```

### Storage Budget

Neon Free tier: 0.5 GB. With 90-day retention on `content_items`:

- `content_items`: ~1,000 rows/day x 2 KB avg x 90 days = ~180 MB
- `feed_summaries` + `feed_videos`: ~100 rows/day x 3 KB = ~27 MB over 90 days
- Other tables: < 10 MB at small scale
- **Total: ~220 MB** — fits on Free tier. Upgrade to Neon Launch ($19/mo) when approaching 400 MB.

---

## Authentication Architecture

### Three Auth Paths

**1. Farcaster Quick Auth (Mini App)**
```
sdk.quickAuth.getToken() → JWT → verifyJwt() via @farcaster/quick-auth
→ Find/create user by FID → is_admin = true if FID === 1568
```

**2. NextAuth v5 (Web Browser)**
```
Google OAuth → cookie-based session → find/create user by email
```

**3. Guest Mode**
```
No auth → browse homepage, public profiles, free videos only
Cannot create feeds, subscribe, or manage anything
```

### Auth Middleware (`src/lib/auth/middleware.ts`)

```
1. Check Authorization: Bearer <token> → Quick Auth JWT → user by FID
2. Check NextAuth session cookie → user by session
3. Neither → null (guest)
```

Two entry points:
- `getAuthUser(request)` — API routes (has access to headers)
- `getServerUser()` — Server components (cookie-only, no Bearer support)

### Admin Guard (`src/lib/auth/admin.ts`)

Uses the `is_admin` database column — not a hardcoded FID check. Additional admins can be added via database update without code changes. All `/admin/*` routes use `requireAdmin(user)` which throws `AuthError(401)` or `AuthError(403)`.

### Edge Middleware (`src/middleware.ts`)

Fast pre-check on `/admin/*` routes: redirects to homepage if no auth cookie or Bearer token is present. Does not validate tokens — full auth happens in API routes.

---

## Payment Architecture

### Single Vendor: Stripe

All payments flow through Stripe — card and USDC stablecoin (on Base). No custom smart contracts.

### Three Payment Types

**1. Platform Subscription ($10/mo per feed)** — User pays Anchor
```
User creates feed → Stripe Checkout (mode: 'subscription') → $10/mo
→ Webhook: invoice.paid → activate feed generation
→ Webhook: customer.subscription.deleted → deactivate feed
```

**2. Creator Subscription (user-to-user)** — Subscriber pays creator, Anchor takes 5%
```
Subscriber clicks "Subscribe $X/mo" → Stripe Checkout (mode: 'subscription')
→ application_fee_percent: 5 (routes 5% to platform)
→ transfer_data.destination: creator's Stripe Connect account
→ 95% goes to creator, 5% to platform
```

**3. Per-Video Purchase (one-time)** — Buyer pays creator, Anchor takes 5%
```
Buyer clicks "Buy for $X" → Stripe Checkout (mode: 'payment')
→ application_fee_amount: calculated 5%
→ transfer_data.destination: creator's Stripe Connect account
→ Webhook: checkout.session.completed → grant access in video_purchases
```

### Stripe Connect (Creator Onboarding)

Creators who want to monetize must connect a Stripe Express account:

```
Creator clicks "Connect Stripe" → POST /api/stripe/connect
→ Stripe-hosted onboarding → return to /stripe/return
→ Verify completion → set stripe_account_id + stripe_onboarding_complete = true
```

Until onboarding is complete, price fields in feed settings are disabled.

### Refund Flow (Admin Only)

```
Admin initiates refund → Stripe refund via API → update payment ledger
→ If video_purchase: delete video_purchases row (revoke access)
→ If subscription: cancel Stripe subscription + update status to 'cancelled'
```

### Webhook Handling (`/api/webhooks/stripe`)

- **Signature verification**: `stripe.webhooks.constructEvent()` on every request
- **Idempotency**: `stripe_events` table — check event ID before processing, record after success
- **Handled events**: `checkout.session.completed` (3 sub-types), `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `account.updated` (Connect)
- **Failed processing**: Returns 500 without recording event (allows Stripe retry)

---

## Scheduling Architecture

### Vercel Cron Config (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/ingest", "schedule": "0 */4 * * *" },
    { "path": "/api/cron/generate-summaries", "schedule": "0 * * * *" }
  ]
}
```

- **Ingest**: Every 4 hours — triggers `ingest-sources` Inngest function
- **Generate**: Every hour — triggers `generate-all-summaries` which fans out to individual feeds

Both cron routes are gated by `CRON_SECRET` Bearer token (Vercel sends this automatically).

### Inngest Function Flow

```
/api/cron/ingest → inngest.send("cron/ingest")
  → ingest-sources: step.run for each source type (email, podcast, twitter, farcaster)

/api/cron/generate-summaries → inngest.send("cron/generate-summaries")
  → generate-all-summaries:
      step.run("get-due-feeds") — timezone-aware schedule check + last_run_date filter
      step.sendEvent("feed/generate-summary" × N due feeds)
  → per feed (generate-feed-summary, concurrency limit: 10):
      1. guard-once-per-day (atomic UPDATE WHERE last_run_date < today)
      2. check-feed-exists
      3. generate-summary (AI summarization model)
      4. generate-script (AI script writing model)
      5. save-summary
      6. submit-video (to provider)
      7. waitForEvent("video/generation.complete", timeout: 30m)
      8. handle timeout (retry with exponential backoff: 5m, 15m, 45m)
      9. finalize-video (download from provider CDN → upload to Vercel Blob)
```

### Once-Per-Day Guard (Race-Safe)

```sql
-- Atomic check-and-set: only succeeds if no other function claimed today
UPDATE feeds SET last_run_date = '2025-01-15'
WHERE id = :feedId AND (last_run_date IS NULL OR last_run_date < '2025-01-15')
-- Returns 0 rows if another function already claimed it
```

### Timezone-Aware Scheduling

Uses `date-fns-tz` for deterministic timezone conversion (not `toLocaleString`, which is unreliable across serverless runtimes):

```typescript
const feedNow = toZonedTime(now, feed.timezone)
return feedNow.getHours() === feed.summary_hour
```

DST edge case: a feed may run 1 hour late at worst. The `last_run_date` guard ensures it never double-runs or skips a day.

---

## Ingestion Pipeline

Four source types, each feature-flagged by environment variable:

| Source Type | Provider | Env Var | Default |
|---|---|---|---|
| Email | Resend incoming API | `RESEND_API_KEY` | Required for core |
| Podcast | AssemblyAI (webhook mode) | `ASSEMBLYAI_API_KEY` | Required for podcasts |
| Twitter | SocialData.tools | `SOCIALDATA_API_KEY` | **Off** — omit to disable |
| Farcaster | Neynar API v2 | `NEYNAR_API_KEY` | Required for FC features |

### Ingestion Flow

- **Email** (`lib/ingestion/email.ts`): Resend API → filter by source sender → dedup → strip HTML to plain text → store as `ready`
- **Podcast** (`lib/ingestion/podcast.ts`): Parse RSS → dedup by GUID → submit audio to AssemblyAI → store as `processing` → webhook updates body + status to `ready`
- **Twitter** (`lib/ingestion/twitter.ts`): SocialData API → latest 50 tweets per handle → store with engagement metrics → `ready`
- **Farcaster** (`lib/ingestion/farcaster.ts`): Neynar API → user casts (by FID) or channel casts (by channel ID) → store with engagement metrics → `ready`

### Deduplication

All ingesters check `(source_id, external_id)` UNIQUE constraint before inserting. Duplicate items are silently skipped.

---

## Processing Pipeline

1. **Gather**: `content_items` where source is in feed's sources, status = `'ready'`, published in last 24h
2. **Rank**: By `feed_sources.priority` DESC, then `published_at` DESC
3. **Context**: Last 3 `feed_summaries` for continuity (avoids repeating stories)
4. **Summarize**: AI model (default: Gemini 2.5 Flash) → markdown summary with citations (800-1200 words)
5. **Script**: AI model (default: Gemini 2.5 Flash-Lite) → conversational news anchor script (350-450 words, configurable tone)
6. **Store**: `feed_summaries` row with summary + script + denormalized content item IDs

### AI Model Configuration

| Task | Default Model | Env Var | Rationale |
|---|---|---|---|
| Summarization | Gemini 2.5 Flash | `AI_SUMMARIZATION_MODEL` | Reasoning-heavy: extract, rank, cite, synthesize |
| Script Writing | Gemini 2.5 Flash-Lite | `AI_SCRIPT_MODEL` | Structured rewriting: budget model suffices |

Supported model prefixes: `gemini*` (Google), `gpt*`/`o1*`/`o3*` (OpenAI), `claude*` (Anthropic), `deepseek*` (DeepSeek).

### AI Cost (at 100 feeds/day)

| Model | Summarization | Script Writing |
|---|---|---|
| Gemini 2.5 Flash (default) | ~$6/mo | — |
| Gemini 2.5 Flash-Lite (default) | — | ~$1/mo |
| GPT-4.1 Mini | ~$5/mo | ~$5/mo |
| DeepSeek V3 | ~$3/mo | ~$3/mo |
| Claude Haiku 4.5 | ~$14/mo | — |

**Default combined: ~$7/mo** for AI at 100 feeds/day.

---

## Video Generation

### Strategy Pattern (`lib/video/`)

```typescript
interface VideoProvider {
  readonly name: string
  submit(req: VideoGenerationRequest): Promise<{ jobId: string }>
  getStatus(jobId: string): Promise<VideoCompletionPayload>
  parseWebhook(body: unknown, headers: Headers): VideoCompletionPayload | null
  verifyWebhookSignature(body: string, headers: Headers): boolean
}
```

| Provider | Cost | Webhook | Status |
|---|---|---|---|
| D-ID | ~$14/mo | Yes | Implemented (default) |
| A2E | ~$10/mo | No (polling) | Implemented |
| HeyGen | ~$99/mo | Yes | Implemented |
| Synthesia | ~$89/mo | Yes | Implemented |

### Video Retry Policy

- Timeout: 30 minutes per attempt (`waitForEvent`)
- Max retries: 3 (configurable per video via `max_retries` column)
- Exponential backoff: 5m → 15m → 45m
- Final failure: status set to `'failed'` with error message

### Video Storage (`lib/video/storage.ts`)

Videos are downloaded from provider CDN and re-hosted on Vercel Blob immediately after generation. Provider CDN URLs expire (D-ID: 7 days, HeyGen: varies), but Vercel Blob URLs are permanent. Stored at `videos/{videoId}.mp4` with public access.

---

## Observability

### Stack: Sentry + Axiom + Inngest Dashboard

| Tool | Covers | Free Tier |
|---|---|---|
| Sentry (`@sentry/nextjs`) | Error tracking, performance traces | 5k errors, 5M spans/mo |
| Axiom (`next-axiom`) | Structured logging, dashboards | 500 GB ingest, 30-day retention/mo |
| Inngest (built-in) | Pipeline step traces, function debugging | Included with Inngest free tier |

**Total cost: $0/mo** until scaling limits are reached.

### Correlation IDs

Each pipeline run gets a UUID correlation ID that appears in:
- **Axiom logs**: Filter by `correlationId` field for full pipeline trace
- **Sentry tags**: `correlationId` tag groups all errors from the same run
- **Inngest**: Built-in step tracing in the Inngest dashboard

### Logger (`lib/observability/logger.ts`)

```typescript
const log = createLogger('inngest:generate-feed-summary', correlationId)
log.info("Summary generated", { feedId, wordCount })
```

Uses Axiom `Logger` when available, falls back to structured JSON console output (picked up by Vercel log drain).

---

## Caching Strategy

### ISR for Public Pages

```typescript
// Homepage, user profiles, feed pages
export const revalidate = 300 // 5 minutes
```

Public pages change at most once per generation cycle. ISR avoids redundant database queries.

### API Route Cache Headers

```typescript
// Public API responses
headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }

// Authenticated routes
headers: { 'Cache-Control': 'private, no-store' }
```

### Rate Limiting

Public API routes use `@upstash/ratelimit` + Vercel KV: sliding window of 60 requests/minute per IP.

Applied to: `/api/feeds`, `/api/sources`, `/api/users/*`, `/api/payments/*`. Not applied to webhook routes (they use signature verification).

Graceful fallback: if KV is not configured (dev), all requests are allowed.

---

## Edge Cases & Hardening

### Webhook Signature Verification

All webhook endpoints verify signatures before processing:

- **Stripe**: `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`
- **AssemblyAI**: HMAC-SHA256 of body against `ASSEMBLYAI_WEBHOOK_SECRET`
- **Video providers**: Provider-specific (`x-d-id-signature`, `x-synthesia-signature`, etc.)

### Webhook Idempotency

All handlers are idempotent for safe retries:

- **Stripe**: `stripe_events` table — check event ID before processing
- **AssemblyAI**: Check `content_items.status` — skip if already `ready`
- **Video providers**: Check `feed_videos.status` — skip if already `completed`

### Stripe Customer Race Condition

`getOrCreateCustomer` uses a conditional UPDATE (`WHERE stripe_customer_id IS NULL`) to prevent duplicate Stripe customers. If another request wins the race, the orphaned customer is deleted.

### AI API Rate Limiting in Fan-Out

When many feeds trigger simultaneously (e.g., 100 feeds at 9 AM PT), the Inngest function has `concurrency: { limit: 10 }` to prevent rate limit errors from AI providers.

### Feed Deletion During Generation

If a feed is deleted while its Inngest function runs, DB queries return no feed → function returns early. Video webhook handlers won't find the `feed_videos` row → return 200 (harmless).

### Content Retention

`content_items` older than 90 days are deleted weekly by the `cleanup-content` function. Summaries are self-contained with embedded citations, so old items aren't needed.

### Empty Feed Handling

If no `ready` content items exist in the last 24 hours, summary generation is skipped. The skip reason is logged in feed metadata: `{ lastSkippedReason: 'no_content', lastSkippedAt: '...' }`.

### Concurrent Schedule Changes

The atomic `last_run_date` guard ensures at most one generation per day regardless of schedule changes. If a user changes `summary_hour` mid-cycle, the feed runs at most 1 hour off from the new time.

### Secret Management

All secrets stored as Vercel encrypted environment variables. Never logged, never committed to git. Secrets: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, `ASSEMBLYAI_API_KEY`, `ASSEMBLYAI_WEBHOOK_SECRET`, `NEYNAR_API_KEY`, `SOCIALDATA_API_KEY`, AI provider API keys.

---

## Testing Strategy

### Test Stack

| Tool | Purpose |
|---|---|
| Vitest | Unit + integration test runner |
| Testing Library | Component testing (`@testing-library/react`) |
| MSW | API mocking for integration tests |
| Playwright | E2E tests (`e2e/` directory, `npm run test:e2e`) |

### Test Organization

```
src/
  lib/
    auth/
      middleware.test.ts              # Unit: auth cascade
    ingestion/
      email.test.ts                   # Unit: mocked Resend
      email.integration.test.ts       # Integration: real DB
    payments/
      refund.test.ts                  # Unit: mocked Stripe
    scheduling/
      functions/
        generate-feed-summary.test.ts # Unit: pipeline steps
  app/
    api/
      webhooks/stripe/route.test.ts   # API: signature + idempotency
      cron/ingest/route.test.ts       # API: CRON_SECRET check
  components/
    payments/
      PaywallGate.test.tsx            # Component: access check
      SubscribeButton.test.tsx        # Component: checkout flow
    admin/
      RefundDialog.test.tsx           # Component: refund UI
```

### Test Conventions

- **Unit tests** (`*.test.ts`): Co-located with source, no external dependencies, fast (<1s each)
- **Integration tests** (`*.integration.test.ts`): Require running Postgres, use transactions with rollback for isolation
- **Mocking**: MSW for HTTP (AI APIs, Stripe, external services), direct mock for DB in unit tests, real DB for integration tests
- **Fixtures**: Shared factories in `src/test/fixtures.ts` (`createTestUser()`, `createTestFeed()`, etc.)
- **CI environment**: `.env.test` with `DATABASE_URL` pointing to `anchor_test` database

### CI Pipeline

```yaml
# .github/workflows/test.yml
- docker compose up -d db
- npx tsx src/lib/db/migrate.ts
- vitest run
```

---

## API Reference

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/[...nextauth]` | — | NextAuth (Google OAuth) |
| POST | `/api/auth/farcaster` | — | Quick Auth token verification |

### Users

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/users/[userId]` | Public | Profile data + stats |
| PUT | `/api/users/me` | Required | Update display name, avatar, wallet |

### Feeds

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/feeds` | Optional | User's feeds (authed) or public feeds (guest) |
| POST | `/api/feeds` | Required | Create feed |
| GET | `/api/feeds/[feedId]` | Optional | Feed detail (respects paywall) |
| PUT | `/api/feeds/[feedId]` | Owner | Update feed |
| DELETE | `/api/feeds/[feedId]` | Owner | Delete feed |
| GET | `/api/feeds/[feedId]/sources` | Owner | List sources (private) |
| POST | `/api/feeds/[feedId]/sources` | Owner | Add source to feed |
| GET | `/api/feeds/[feedId]/summaries` | Optional | List summaries (respects paywall) |
| GET | `/api/feeds/[feedId]/videos` | Optional | List videos (respects paywall) |
| POST | `/api/feeds/[feedId]/generate` | Owner | Manual trigger (respects once/day) |

### Sources

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/sources` | Public | Browse all sources |
| POST | `/api/sources` | Required | Create source |
| POST | `/api/sources/discover` | Required | AI newsletter discovery |

### Payments

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/checkout` | Required | Stripe Checkout ($10/mo platform fee) |
| POST | `/api/payments/subscribe` | Required | Stripe Checkout (user-to-user via Connect) |
| POST | `/api/payments/purchase-video` | Required | Stripe Checkout (one-time video via Connect) |
| GET | `/api/payments/access/[feedId]` | Required | Check feed access |

### Stripe Connect

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/stripe/connect` | Required | Create Connect account link |
| GET | `/api/stripe/account-status` | Required | Check Connect onboarding status |

### Webhooks (all signature-verified)

| Method | Route | Signature | Description |
|---|---|---|---|
| POST | `/api/webhooks/stripe` | Stripe SDK | Payments, subscriptions, Connect |
| POST | `/api/webhooks/assemblyai` | HMAC-SHA256 | Podcast transcription completion |
| POST | `/api/webhooks/video/[provider]` | Provider-specific | Video generation completion |

### Admin (is_admin only)

| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | Overview stats |
| GET | `/api/admin/users` | User list + subscriptions |
| GET | `/api/admin/payments` | Transaction ledger |
| POST | `/api/admin/refund` | Refund payment (Stripe API + ledger) |
| GET | `/api/admin/feeds` | All feeds health |
| GET | `/api/admin/services` | Ingestion + generation health |
| GET | `/api/admin/pinned-feeds` | List pinned feeds |
| POST | `/api/admin/pinned-feeds` | Pin a feed |
| PUT | `/api/admin/pinned-feeds/[id]` | Reorder pinned feed |
| DELETE | `/api/admin/pinned-feeds/[id]` | Unpin a feed |

### Scheduling (CRON_SECRET gated)

| Method | Route | Description |
|---|---|---|
| GET | `/api/cron/ingest` | Trigger content ingestion |
| GET | `/api/cron/generate-summaries` | Trigger summary generation fan-out |
| POST | `/api/inngest` | Inngest serve endpoint |

---

## Estimated Monthly Cost

| Service | Tier | Cost |
|---|---|---|
| Vercel | Pro | $20 |
| Neon PostgreSQL | Free (0.5 GB) → Launch when needed | $0-19 |
| Inngest | Free (100k executions) | $0 |
| Resend | Free (100 emails/day) | $0 |
| Neynar | Free → Starter ($9 if needed) | $0-9 |
| AssemblyAI | $0.65/hr | ~$5-15 |
| AI (Summarization) | Gemini 2.5 Flash | ~$6 |
| AI (Script Writing) | Gemini 2.5 Flash-Lite | ~$1 |
| SocialData.tools | $0.20/1k tweets (optional) | $0-5 |
| D-ID or A2E | Video generation | ~$10-15 |
| Vercel Blob | Free (1 GB) → $0.15/GB | $0-5 |
| Vercel KV | Free (30k requests/day) | $0 |
| Stripe | 2.9% + $0.30 (card) / 1.5% (USDC) | Variable |
| Sentry | Free Developer plan | $0 |
| Axiom | Free Personal plan | $0 |
| **Total (platform)** | | **~$37-75/mo** |
| **Revenue per feed** | $10/mo + 5% of user-to-user | Scales |

---

## Deployment

Deployed on Vercel. Cron jobs are configured in `vercel.json`:

- `/api/cron/ingest` — every 4 hours (content ingestion)
- `/api/cron/generate-summaries` — every hour (checks which feeds are due)

Inngest functions handle the actual processing with step functions, retries, and `waitForEvent` for async video generation.

---

## Recently Implemented Features

- **Account linking** — Merge Farcaster + Google accounts when same verified email is detected (`POST /api/auth/link-accounts`)
- **NeynarAuthButton (SIWF on web)** — Sign In With Farcaster via Neynar's auth button in AppProvider
- **fc:frame metadata** — Farcaster frame embed metadata on feed pages for sharing videos in casts
- **Notifications** — In-app notifications with optional Farcaster push (`GET/PUT /api/notifications`); "video ready" notifications sent after video generation
- **Guest → auth upgrade flow** — SignInPrompt component shown when unauthenticated users hit paywalled content
- **HeyGen video provider** — $99/mo tier, webhook-based (`src/lib/video/providers/heygen.ts`)
- **Synthesia video provider** — $89/mo tier, webhook-based (`src/lib/video/providers/synthesia.ts`)
- **Playwright E2E tests** — End-to-end tests for homepage, feed pages, and auth flows (`e2e/` directory)
