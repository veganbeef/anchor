import Anthropic from "@anthropic-ai/sdk"
import type { AIProvider } from "../types"
import type { SummaryInput, ScriptInput } from "@/types"
import { buildSummaryPrompt, buildScriptPrompt } from "./google"

export class AnthropicProvider implements AIProvider {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async generateSummary(input: SummaryInput): Promise<string> {
    const response = await this.client.messages.create({
      model: process.env.AI_SUMMARIZATION_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: buildSummaryPrompt(input) }],
    })
    const block = response.content[0]
    return block.type === "text" ? block.text : ""
  }

  async generateScript(input: ScriptInput): Promise<string> {
    const response = await this.client.messages.create({
      model: process.env.AI_SCRIPT_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildScriptPrompt(input) }],
    })
    const block = response.content[0]
    return block.type === "text" ? block.text : ""
  }
}
