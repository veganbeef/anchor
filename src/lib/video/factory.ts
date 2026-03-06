/**
 * Video provider factory using strategy pattern.
 * Supports: d-id (default, $14.40/mo, webhook), a2e ($9.99/mo), heygen ($99/mo), synthesia ($89/mo).
 * Provider selected per-feed via feeds.video_provider column, with VIDEO_PROVIDER env var as global default.
 */
import type { VideoProvider } from "./types"
import type { VideoProviderName } from "@/types"

export async function createVideoProvider(name?: VideoProviderName): Promise<VideoProvider> {
  const providerName = name || (process.env.VIDEO_PROVIDER as VideoProviderName) || "d-id"

  switch (providerName) {
    case "d-id": {
      const { DIDProvider } = await import("./providers/d-id")
      return new DIDProvider(process.env.DID_API_KEY!)
    }
    case "a2e": {
      const { A2EProvider } = await import("./providers/a2e")
      return new A2EProvider(process.env.A2E_API_KEY!)
    }
    case "heygen": {
      const { HeyGenProvider } = await import("./providers/heygen")
      return new HeyGenProvider(process.env.HEYGEN_API_KEY!)
    }
    case "synthesia": {
      const { SynthesiaProvider } = await import("./providers/synthesia")
      return new SynthesiaProvider(process.env.SYNTHESIA_API_KEY!)
    }
    default:
      throw new Error(`Unknown video provider: ${providerName}`)
  }
}
