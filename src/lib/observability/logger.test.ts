import { describe, it, expect, vi, beforeEach } from "vitest"
import { createLogger, _disableAxiom } from "./logger"

beforeEach(() => {
  // Force the console fallback path by disabling the Axiom module cache
  _disableAxiom()
})

describe("createLogger", () => {
  it("creates logger with source", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const logger = createLogger("test-source")
    logger.info("test message")

    expect(spy).toHaveBeenCalledOnce()
    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.level).toBe("info")
    expect(logged.message).toBe("test message")
    expect(logged.source).toBe("test-source")
    expect(logged.timestamp).toBeDefined()

    spy.mockRestore()
  })

  it("includes correlation ID when provided", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const logger = createLogger("test", "corr-123")
    logger.info("test")

    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.correlationId).toBe("corr-123")

    spy.mockRestore()
  })

  it("supports warn and error levels", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const logger = createLogger("test")
    logger.warn("warning")
    logger.error("error")

    expect(warnSpy).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledOnce()

    const warnLogged = JSON.parse(warnSpy.mock.calls[0][0])
    expect(warnLogged.level).toBe("warn")

    const errorLogged = JSON.parse(errorSpy.mock.calls[0][0])
    expect(errorLogged.level).toBe("error")

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
