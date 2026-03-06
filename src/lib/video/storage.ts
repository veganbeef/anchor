/**
 * Persists generated videos to Vercel Blob for permanent storage.
 * Provider CDN URLs expire (D-ID: 7 days, HeyGen: varies), so videos
 * are re-hosted on Vercel Blob immediately after generation.
 * Videos stored at videos/{videoId}.mp4 with public access.
 */
import { put } from "@vercel/blob"

export async function persistVideo(
  videoId: string,
  providerUrl: string,
): Promise<{ url: string; thumbnailUrl?: string }> {
  const response = await fetch(providerUrl)
  if (!response.ok) {
    throw new Error(`Failed to download video from provider: ${response.status}`)
  }

  const videoBlob = await response.blob()
  const { url } = await put(`videos/${videoId}.mp4`, videoBlob, {
    access: "public",
    contentType: "video/mp4",
  })

  return { url }
}
