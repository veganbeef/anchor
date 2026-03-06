import { describe, it, expect, vi, beforeEach } from "vitest"
import { createVideoProvider } from "./factory"

vi.mock("./providers/d-id", () => ({
  DIDProvider: class {
    readonly name = "d-id"
    constructor(_apiKey: string) {}
  },
}))
vi.mock("./providers/a2e", () => ({
  A2EProvider: class {
    readonly name = "a2e"
    constructor(_apiKey: string) {}
  },
}))
vi.mock("./providers/heygen", () => ({
  HeyGenProvider: class {
    readonly name = "heygen"
    constructor(_apiKey: string) {}
  },
}))
vi.mock("./providers/synthesia", () => ({
  SynthesiaProvider: class {
    readonly name = "synthesia"
    constructor(_apiKey: string) {}
  },
}))

beforeEach(() => {
  vi.stubEnv("DID_API_KEY", "test-did-key")
  vi.stubEnv("A2E_API_KEY", "test-a2e-key")
  vi.stubEnv("HEYGEN_API_KEY", "test-heygen-key")
  vi.stubEnv("SYNTHESIA_API_KEY", "test-synthesia-key")
})

describe("createVideoProvider", () => {
  it("creates D-ID provider", async () => {
    const provider = await createVideoProvider("d-id")
    expect(provider.name).toBe("d-id")
  })

  it("creates A2E provider", async () => {
    const provider = await createVideoProvider("a2e")
    expect(provider.name).toBe("a2e")
  })

  it("creates HeyGen provider", async () => {
    const provider = await createVideoProvider("heygen")
    expect(provider.name).toBe("heygen")
  })

  it("creates Synthesia provider", async () => {
    const provider = await createVideoProvider("synthesia")
    expect(provider.name).toBe("synthesia")
  })

  it("throws for unknown providers", async () => {
    await expect(createVideoProvider("unknown" as any)).rejects.toThrow("Unknown video provider")
  })

  it("defaults to d-id when no provider specified", async () => {
    vi.stubEnv("VIDEO_PROVIDER", "d-id")
    const provider = await createVideoProvider()
    expect(provider.name).toBe("d-id")
  })
})
