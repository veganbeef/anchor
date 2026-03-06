/**
 * Rate limiting via Upstash (@upstash/ratelimit) + Vercel KV (Redis).
 *
 * Default: sliding window of 60 requests per minute per IP.
 * Applied to public API routes (/api/feeds, /api/sources, /api/users, /api/payments).
 * Not applied to webhook routes (they use signature verification instead).
 *
 * Graceful fallback: if KV is not configured (dev environment), allows all requests.
 */
import { Ratelimit } from "@upstash/ratelimit"
import { kv } from "@vercel/kv"

let ratelimit: Ratelimit | null = null

export function getRatelimit(): Ratelimit {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(60, "1m"),
    })
  }
  return ratelimit
}

export async function checkRateLimit(
  identifier: string,
): Promise<{ success: boolean }> {
  try {
    const rl = getRatelimit()
    return await rl.limit(identifier)
  } catch {
    // If KV is not configured, allow all requests (dev environment)
    return { success: true }
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1"
  )
}
