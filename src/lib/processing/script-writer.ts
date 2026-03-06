/**
 * Converts an AI summary into a spoken news anchor script.
 *
 * Uses a separate (typically cheaper) AI model from summarization — configured
 * via AI_SCRIPT_MODEL env var. Supports configurable tone and max word count
 * (default: 400 words) via feed metadata.
 */
import { getScriptProvider } from "@/lib/ai/factory"
import type { ScriptInput } from "@/types"

export async function generateScript(
  summary: string,
  feedName: string,
  options?: { tone?: string; maxWords?: number },
): Promise<string> {
  const input: ScriptInput = {
    summary,
    feedName,
    tone: options?.tone,
    maxWords: options?.maxWords ?? 400,
  }

  const provider = await getScriptProvider()
  return provider.generateScript(input)
}
