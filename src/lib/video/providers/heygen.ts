import type { VideoProvider } from "../types"
import type { VideoGenerationRequest, VideoCompletionPayload } from "@/types"

export class HeyGenProvider implements VideoProvider {
  readonly name = "heygen"
  private apiKey: string
  private baseUrl = "https://api.heygen.com/v2"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async submit(req: VideoGenerationRequest): Promise<{ jobId: string }> {
    const response = await fetch(`${this.baseUrl}/video/generate`, {
      method: "POST",
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: req.avatarId || "default",
            },
            voice: {
              type: "text",
              input_text: req.script,
              voice_id: req.voiceId || "en-US-JennyNeural",
            },
          },
        ],
        ...(req.config || {}),
      }),
    })

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${response.status} ${await response.text()}`)
    }

    const data = (await response.json()) as { data: { video_id: string } }
    return { jobId: data.data.video_id }
  }

  async getStatus(jobId: string): Promise<VideoCompletionPayload> {
    const response = await fetch(`${this.baseUrl}/video/status.get?video_id=${jobId}`, {
      headers: { "X-Api-Key": this.apiKey },
    })

    if (!response.ok) {
      throw new Error(`HeyGen status error: ${response.status}`)
    }

    const data = (await response.json()) as {
      data: { video_id: string; status: string; video_url?: string; thumbnail_url?: string; duration?: number; error?: string }
    }

    return {
      jobId: data.data.video_id,
      status: data.data.status === "completed" ? "completed" : data.data.status === "failed" ? "failed" : "completed",
      videoUrl: data.data.video_url,
      thumbnailUrl: data.data.thumbnail_url,
      durationSeconds: data.data.duration,
      error: data.data.error,
    }
  }

  parseWebhook(body: unknown, _headers: Headers): VideoCompletionPayload | null {
    const data = body as { event_type?: string; data?: { video_id?: string; status?: string; video_url?: string } }
    if (!data?.data?.video_id) return null
    return {
      jobId: data.data.video_id,
      status: data.data.status === "completed" ? "completed" : "failed",
      videoUrl: data.data.video_url,
    }
  }

  verifyWebhookSignature(body: string, headers: Headers): boolean {
    const signature = headers.get("x-heygen-signature")
    if (!signature || !process.env.HEYGEN_WEBHOOK_SECRET) return true
    const crypto = require("crypto")
    const expected = crypto.createHmac("sha256", process.env.HEYGEN_WEBHOOK_SECRET).update(body).digest("hex")
    return signature === expected
  }
}
