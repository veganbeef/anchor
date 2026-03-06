import type { VideoProvider } from "../types"
import type { VideoGenerationRequest, VideoCompletionPayload } from "@/types"

export class DIDProvider implements VideoProvider {
  readonly name = "d-id"
  private apiKey: string
  private baseUrl = "https://api.d-id.com"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async submit(req: VideoGenerationRequest): Promise<{ jobId: string }> {
    const response = await fetch(`${this.baseUrl}/talks`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: req.avatarId || "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
        script: {
          type: "text",
          input: req.script,
          provider: { type: "microsoft", voice_id: req.voiceId || "en-US-JennyNeural" },
        },
        webhook: `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL}/api/webhooks/video/d-id`,
        ...(req.config || {}),
      }),
    })

    if (!response.ok) {
      throw new Error(`D-ID API error: ${response.status} ${await response.text()}`)
    }

    const data = await response.json() as { id: string }
    return { jobId: data.id }
  }

  async getStatus(jobId: string): Promise<VideoCompletionPayload> {
    const response = await fetch(`${this.baseUrl}/talks/${jobId}`, {
      headers: { Authorization: `Basic ${this.apiKey}` },
    })

    if (!response.ok) {
      throw new Error(`D-ID status error: ${response.status}`)
    }

    const data = await response.json() as { id: string; status: string; result_url?: string; error?: { description: string } }

    return {
      jobId: data.id,
      status: data.status === "done" ? "completed" : data.status === "error" ? "failed" : "completed",
      videoUrl: data.result_url,
      error: data.error?.description,
    }
  }

  parseWebhook(body: unknown, _headers: Headers): VideoCompletionPayload | null {
    const data = body as { id?: string; status?: string; result_url?: string; error?: { description: string } }
    if (!data?.id) return null
    return {
      jobId: data.id,
      status: data.status === "done" ? "completed" : "failed",
      videoUrl: data.result_url,
      error: data.error?.description,
    }
  }

  verifyWebhookSignature(body: string, headers: Headers): boolean {
    const signature = headers.get("x-d-id-signature")
    if (!signature || !process.env.DID_WEBHOOK_SECRET) return true // Skip if no secret configured
    // D-ID webhook signature verification
    const crypto = require("crypto")
    const expected = crypto.createHmac("sha256", process.env.DID_WEBHOOK_SECRET).update(body).digest("hex")
    return signature === expected
  }
}
