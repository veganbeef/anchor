import type { VideoProvider } from "../types"
import type { VideoGenerationRequest, VideoCompletionPayload } from "@/types"

export class A2EProvider implements VideoProvider {
  readonly name = "a2e"
  private apiKey: string
  private baseUrl = "https://api.a2e.ai/v1"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async submit(req: VideoGenerationRequest): Promise<{ jobId: string }> {
    const response = await fetch(`${this.baseUrl}/videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        script: req.script,
        avatar_id: req.avatarId,
        voice_id: req.voiceId,
        ...(req.config || {}),
      }),
    })

    if (!response.ok) {
      throw new Error(`A2E API error: ${response.status} ${await response.text()}`)
    }

    const data = await response.json() as { id: string }
    return { jobId: data.id }
  }

  async getStatus(jobId: string): Promise<VideoCompletionPayload> {
    const response = await fetch(`${this.baseUrl}/videos/${jobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })

    if (!response.ok) {
      throw new Error(`A2E status error: ${response.status}`)
    }

    const data = await response.json() as { id: string; status: string; video_url?: string; thumbnail_url?: string; duration?: number; error?: string }

    return {
      jobId: data.id,
      status: data.status === "completed" ? "completed" : data.status === "failed" ? "failed" : "completed",
      videoUrl: data.video_url,
      thumbnailUrl: data.thumbnail_url,
      durationSeconds: data.duration,
      error: data.error,
    }
  }

  parseWebhook(): VideoCompletionPayload | null {
    return null // A2E uses polling, not webhooks
  }

  verifyWebhookSignature(): boolean {
    return false // No webhook support
  }
}
