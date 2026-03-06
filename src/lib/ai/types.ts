import type { SummaryInput, ScriptInput } from "@/types"

/**
 * Contract for all AI provider implementations (Google, OpenAI, Anthropic, DeepSeek).
 */
export interface AIProvider {
  /** Takes content items + feed context, returns markdown summary with citations. */
  generateSummary(input: SummaryInput): Promise<string>
  /** Takes summary text, returns a conversational news anchor script. */
  generateScript(input: ScriptInput): Promise<string>
}
