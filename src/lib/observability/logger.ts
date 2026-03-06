/**
 * Structured logging with Axiom (next-axiom) integration and console fallback.
 *
 * Every logger instance carries a source identifier and optional correlation ID
 * for end-to-end tracing.
 *
 * - Axiom: structured logs sent to Axiom dashboard (500 GB/mo free tier, 30-day retention)
 * - Fallback: JSON-structured console output (picked up by Vercel log drain if
 *   Axiom not configured)
 */
interface LoggerInterface {
  info(message: string, fields?: Record<string, unknown>): void
  warn(message: string, fields?: Record<string, unknown>): void
  error(message: string, fields?: Record<string, unknown>): void
  flush(): void | Promise<void>
}

type AxiomModule = typeof import("next-axiom")
let _axiomLogger: AxiomModule | null | undefined

function getAxiomModule(): AxiomModule | null {
  if (_axiomLogger === undefined) {
    try {
      _axiomLogger = require("next-axiom")
    } catch {
      _axiomLogger = null
    }
  }
  return _axiomLogger
}

/** Disable Axiom — forces the console fallback. Used by tests. */
export function _disableAxiom() {
  _axiomLogger = null
}

export function createLogger(source: string, correlationId?: string): LoggerInterface {
  const baseFields = { source, ...(correlationId ? { correlationId } : {}) }

  // Try to use Axiom's Logger for structured logging + dashboard support
  const axiom = getAxiomModule()
  if (axiom) {
    return new axiom.Logger({
      source,
      args: correlationId ? { correlationId } : undefined,
    })
  }

  return {
    info(message: string, fields?: Record<string, unknown>) {
      console.log(JSON.stringify({ level: "info", message, ...baseFields, ...fields, timestamp: new Date().toISOString() }))
    },
    warn(message: string, fields?: Record<string, unknown>) {
      console.warn(JSON.stringify({ level: "warn", message, ...baseFields, ...fields, timestamp: new Date().toISOString() }))
    },
    error(message: string, fields?: Record<string, unknown>) {
      console.error(JSON.stringify({ level: "error", message, ...baseFields, ...fields, timestamp: new Date().toISOString() }))
    },
    flush() {
      // No-op for console logger; next-axiom Logger has a real flush
    },
  }
}
