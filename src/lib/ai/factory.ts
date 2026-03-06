/**
 * AI provider factory — routes model names to provider implementations based on prefix.
 * Supports: gemini → Google, gpt/o1/o3 → OpenAI, claude → Anthropic, deepseek → DeepSeek.
 *
 * Two configurable models via env vars:
 * - AI_SUMMARIZATION_MODEL (default: gemini-2.5-flash) — needs reasoning for ranking, citing, synthesizing
 * - AI_SCRIPT_MODEL (default: gemini-2.5-flash-lite) — structured rewriting, less reasoning needed
 */
import type { AIProvider } from "./types"

/** Lazily loads and instantiates the provider matching the model name prefix. */
export async function createAIProvider(modelName: string): Promise<AIProvider> {
  if (modelName.startsWith("gemini")) {
    const { GoogleAIProvider } = await import("./providers/google")
    return new GoogleAIProvider(process.env.GOOGLE_AI_API_KEY!)
  }
  if (modelName.startsWith("gpt") || modelName.startsWith("o1") || modelName.startsWith("o3")) {
    const { OpenAIProvider } = await import("./providers/openai")
    return new OpenAIProvider(process.env.OPENAI_API_KEY!)
  }
  if (modelName.startsWith("claude")) {
    const { AnthropicProvider } = await import("./providers/anthropic")
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY!)
  }
  if (modelName.startsWith("deepseek")) {
    const { DeepSeekProvider } = await import("./providers/deepseek")
    return new DeepSeekProvider(process.env.DEEPSEEK_API_KEY!)
  }
  throw new Error(`Unknown AI model: ${modelName}. Expected prefix: gemini, gpt, claude, or deepseek`)
}

export async function getSummarizationProvider(): Promise<AIProvider> {
  const model = process.env.AI_SUMMARIZATION_MODEL || "gemini-2.5-flash"
  return createAIProvider(model)
}

export async function getScriptProvider(): Promise<AIProvider> {
  const model = process.env.AI_SCRIPT_MODEL || "gemini-2.5-flash-lite"
  return createAIProvider(model)
}
