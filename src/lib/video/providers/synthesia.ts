import type { VideoProvider } from "../types"
import type { VideoGenerationRequest, VideoCompletionPayload } from "@/types"

export class SynthesiaProvider implements VideoProvider {
  readonly name = "synthesia"
  private apiKey: string
  private baseUrl = "https://api.synthesia.io/v2"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async submit(req: VideoGenerationRequest): Promise<{ jobId: string }> {
    const response = await fetch(`${this.baseUrl}/videos`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scriptText: req.script,
        avatar: req.avatarId || "anna_costume1_cameraA",
        soundtrack: "corporate",
        ...(req.config || {}),
      }),
    })

    if (!response.ok) {
      throw new Error(`Synthesia API error: ${response.status} ${await response.text()}`)
    }

    const data = (await response.json()) as { id: string }
    return { jobId: data.id }
  }

  async getStatus(jobId: string): Promise<VideoCompletionPayload> {
    const response = await fetch(`${this.baseUrl}/videos/${jobId}`, {
      headers: { Authorization: this.apiKey },
    })

    if (!response.ok) {
      throw new Error(`Synthesia status error: ${response.status}`)
    }

    const data = (await response.json()) as { id: string; status: string; download?: string; duration?: number; error?: string }

    return {
      jobId: data.id,
      status: data.status === "complete" ? "completed" : data.status === "error" ? "failed" : "completed",
      videoUrl: data.download,
      durationSeconds: data.duration,
      error: data.error,
    }
  }

  parseWebhook(body: unknown, _headers: Headers): VideoCompletionPayload | null {
    const data = body as { id?: string; status?: string; download?: string }
    if (!data?.id) return null
    return {
      jobId: data.id,
      status: data.status === "complete" ? "completed" : "failed",
      videoUrl: data.download,
    }
  }

  verifyWebhookSignature(body: string, headers: Headers): boolean {
    const signature = headers.get("x-synthesia-signature")
    if (!signature || !process.env.SYNTHESIA_WEBHOOK_SECRET) return true
    const crypto = require("crypto")
    const expected = crypto.createHmac("sha256", process.env.SYNTHESIA_WEBHOOK_SECRET).update(body).digest("hex")
    return signature === expected
  }
}
