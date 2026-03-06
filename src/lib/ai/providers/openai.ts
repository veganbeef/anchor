import OpenAI from "openai"
import type { AIProvider } from "../types"
import type { SummaryInput, ScriptInput } from "@/types"
import { buildSummaryPrompt, buildScriptPrompt } from "./google"

export class OpenAIProvider implements AIProvider {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async generateSummary(input: SummaryInput): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: process.env.AI_SUMMARIZATION_MODEL || "gpt-4.1-mini",
      messages: [{ role: "user", content: buildSummaryPrompt(input) }],
    })
    return response.choices[0]?.message?.content ?? ""
  }

  async generateScript(input: ScriptInput): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: process.env.AI_SCRIPT_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: buildScriptPrompt(input) }],
    })
    return response.choices[0]?.message?.content ?? ""
  }
}
