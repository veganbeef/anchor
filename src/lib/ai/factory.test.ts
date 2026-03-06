import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("./providers/google", () => ({
  GoogleAIProvider: class {
    constructor(_apiKey: string) {}
    generateSummary = vi.fn()
    generateScript = vi.fn()
  },
}))
vi.mock("./providers/openai", () => ({
  OpenAIProvider: class {
    constructor(_apiKey: string) {}
    generateSummary = vi.fn()
    generateScript = vi.fn()
  },
}))
vi.mock("./providers/anthropic", () => ({
  AnthropicProvider: class {
    constructor(_apiKey: string) {}
    generateSummary = vi.fn()
    generateScript = vi.fn()
  },
}))
vi.mock("./providers/deepseek", () => ({
  DeepSeekProvider: class {
    constructor(_apiKey: string) {}
    generateSummary = vi.fn()
    generateScript = vi.fn()
  },
}))

import { createAIProvider } from "./factory"

// Mock environment variables
beforeEach(() => {
  vi.stubEnv("GOOGLE_AI_API_KEY", "test-google-key")
  vi.stubEnv("OPENAI_API_KEY", "test-openai-key")
  vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key")
  vi.stubEnv("DEEPSEEK_API_KEY", "test-deepseek-key")
})

describe("createAIProvider", () => {
  it("throws for unknown model prefix", async () => {
    await expect(createAIProvider("unknown-model")).rejects.toThrow("Unknown AI model")
  })

  it("creates Google provider for gemini prefix", async () => {
    const provider = await createAIProvider("gemini-2.5-flash")
    expect(provider).toBeDefined()
    expect(provider.generateSummary).toBeDefined()
    expect(provider.generateScript).toBeDefined()
  })

  it("creates OpenAI provider for gpt prefix", async () => {
    const provider = await createAIProvider("gpt-4o-mini")
    expect(provider).toBeDefined()
  })

  it("creates Anthropic provider for claude prefix", async () => {
    const provider = await createAIProvider("claude-haiku-4-5-20251001")
    expect(provider).toBeDefined()
  })

  it("creates DeepSeek provider for deepseek prefix", async () => {
    const provider = await createAIProvider("deepseek-chat")
    expect(provider).toBeDefined()
  })
})
