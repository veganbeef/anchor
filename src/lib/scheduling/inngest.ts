/**
 * Inngest client for background job orchestration.
 *
 * Handles step functions with retries, waitForEvent for async video generation,
 * and fan-out scheduling. Free tier: 100k executions/month (~300 feeds/day).
 */
import { Inngest } from "inngest"

export const inngest = new Inngest({
  id: "anchor",
  name: "Anchor",
})
