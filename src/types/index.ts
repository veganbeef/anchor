// Auth types
export type AuthMethod = 'farcaster' | 'google' | 'email' | 'guest'

// Source types
export type SourceType = 'email' | 'podcast' | 'twitter' | 'farcaster'

// Content status
export type ContentStatus = 'pending' | 'processing' | 'ready' | 'failed'

// Video provider
export type VideoProviderName = 'a2e' | 'heygen' | 'synthesia' | 'd-id'

// Video status
export type VideoStatus = 'pending' | 'generating' | 'completed' | 'failed'

// Subscription status
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'unpaid'

// Payment types
export type PaymentType = 'platform_subscription' | 'user_subscription' | 'video_purchase'
export type PaymentMethod = 'card' | 'usdc'
export type PaymentStatus = 'completed' | 'failed' | 'refunded'

// AI model config
export interface AIModelConfig {
  model: string
  provider: 'google' | 'openai' | 'anthropic' | 'deepseek'
}

// Summary input for AI
export interface SummaryInput {
  contentItems: Array<{
    title: string | null
    body: string | null
    url: string | null
    authorName: string | null
    authorHandle: string | null
    sourceName: string
    publishedAt: Date
  }>
  feedName: string
  previousSummaries: string[]
}

// Script input for AI
export interface ScriptInput {
  summary: string
  feedName: string
  tone?: string
  maxWords?: number
}

// Video generation request
export interface VideoGenerationRequest {
  script: string
  avatarId?: string
  voiceId?: string
  style?: string
  config?: Record<string, unknown>
}

// Video completion payload
export interface VideoCompletionPayload {
  jobId: string
  status: 'completed' | 'failed'
  videoUrl?: string
  thumbnailUrl?: string
  durationSeconds?: number
  error?: string
}

// Authenticated user (from middleware)
export interface AuthUser {
  id: string
  fid: number | null
  email: string | null
  username: string
  displayName: string
  avatarUrl: string | null
  isAdmin: boolean
  stripeCustomerId: string | null
  stripeAccountId: string | null
  stripeOnboardingComplete: boolean
}
