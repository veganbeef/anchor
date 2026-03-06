import type { AuthUser } from "@/types"

export function createTestUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "test-user-id",
    fid: null,
    email: "test@example.com",
    username: "testuser",
    displayName: "Test User",
    avatarUrl: null,
    isAdmin: false,
    stripeCustomerId: null,
    stripeAccountId: null,
    stripeOnboardingComplete: false,
    ...overrides,
  }
}

export function createTestAdmin(overrides: Partial<AuthUser> = {}): AuthUser {
  return createTestUser({
    id: "admin-user-id",
    fid: 1568,
    username: "admin",
    displayName: "Admin",
    isAdmin: true,
    ...overrides,
  })
}

export function createTestFeed(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-feed-id",
    user_id: "test-user-id",
    name: "Test Feed",
    description: "A test feed",
    summary_hour: 9,
    timezone: "America/Los_Angeles",
    last_run_date: null,
    video_enabled: true,
    video_provider: "d-id",
    video_config: null,
    is_public: true,
    subscription_price_usd: "0.00",
    per_video_price_usd: "0.00",
    is_active: true,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function createTestContentItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-content-id",
    source_id: "test-source-id",
    external_id: "ext-123",
    title: "Test Article",
    body: "This is a test article body with some content.",
    url: "https://example.com/article",
    author_name: "Test Author",
    author_handle: "@testauthor",
    status: "ready",
    ai_summary: null,
    published_at: new Date().toISOString(),
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}
