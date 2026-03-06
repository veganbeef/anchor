import type { VideoGenerationRequest, VideoCompletionPayload } from "@/types"

/**
 * Contract for video generation providers (D-ID, A2E, HeyGen, Synthesia).
 */
export interface VideoProvider {
  readonly name: string
  /** Submits script for video generation, returns external job ID. */
  submit(req: VideoGenerationRequest): Promise<{ jobId: string }>
  /** Polls provider for job status (used by providers without webhook support). */
  getStatus(jobId: string): Promise<VideoCompletionPayload>
  /** Parses provider-specific webhook payload into standard VideoCompletionPayload. */
  parseWebhook(body: unknown, headers: Headers): VideoCompletionPayload | null
  /** Validates webhook authenticity using provider-specific signature mechanism. */
  verifyWebhookSignature(body: string, headers: Headers): boolean
}
