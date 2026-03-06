/**
 * Sentry error tracking helpers with correlation ID propagation.
 *
 * - setCorrelationId: tags Sentry scope so errors from the same pipeline run are grouped
 * - captureException: wraps Sentry.captureException with graceful fallback if not configured
 *
 * Sentry setup: @sentry/nextjs with 10% trace sample rate, free Developer plan
 * (5k errors, 5M spans).
 */

export function setCorrelationId(correlationId: string) {
  try {
    const Sentry = require("@sentry/nextjs")
    Sentry.setTag("correlationId", correlationId)
  } catch {
    // Sentry not configured
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  try {
    const Sentry = require("@sentry/nextjs")
    Sentry.captureException(error, { extra: context })
  } catch {
    console.error("Sentry not available:", error)
  }
}
