import { describe, it, expect } from "vitest"
import { getClientIp } from "./rate-limit"

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    })
    expect(getClientIp(request)).toBe("1.2.3.4")
  })

  it("returns localhost when no header present", () => {
    const request = new Request("http://localhost")
    expect(getClientIp(request)).toBe("127.0.0.1")
  })
})
