import { GoogleGenAI } from "@google/genai"
import type { AIProvider } from "../types"
import type { SummaryInput, ScriptInput } from "@/types"

export class GoogleAIProvider implements AIProvider {
  private client: GoogleGenAI

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async generateSummary(input: SummaryInput): Promise<string> {
    const prompt = buildSummaryPrompt(input)
    const response = await this.client.models.generateContent({
      model: process.env.AI_SUMMARIZATION_MODEL || "gemini-2.5-flash",
      contents: prompt,
    })
    return response.text ?? ""
  }

  async generateScript(input: ScriptInput): Promise<string> {
    const prompt = buildScriptPrompt(input)
    const response = await this.client.models.generateContent({
      model: process.env.AI_SCRIPT_MODEL || "gemini-2.5-flash-lite",
      contents: prompt,
    })
    return response.text ?? ""
  }
}

function buildSummaryPrompt(input: SummaryInput): string {
  const items = input.contentItems
    .map((item, i) => {
      return `[${i + 1}] "${item.title || 'Untitled'}" by ${item.authorName || item.authorHandle || 'Unknown'} (${item.sourceName})
${item.body?.slice(0, 2000) || 'No content'}
URL: ${item.url || 'N/A'}`
    })
    .join("\n\n")

  const previousContext = input.previousSummaries.length > 0
    ? `\nPrevious summaries for context (avoid repeating):\n${input.previousSummaries.slice(0, 3).join("\n---\n")}\n`
    : ""

  return `You are a news analyst creating a daily briefing for "${input.feedName}".

Analyze the following ${input.contentItems.length} content items and produce a comprehensive summary (800-1200 words) with:
1. **Top Stories** — The 3-5 most important developments, with citations [1], [2], etc.
2. **Key Updates** — Notable but secondary items
3. **Quick Hits** — Brief mentions of remaining items
4. **Outlook** — What to watch for next

Use markdown formatting. Cite sources using bracket notation [1], [2], etc.
${previousContext}
Content items:
${items}`
}

function buildScriptPrompt(input: ScriptInput): string {
  return `Convert this news summary into a spoken news anchor script for "${input.feedName}".

Requirements:
- Conversational, professional tone${input.tone ? ` (${input.tone})` : ""}
- ${input.maxWords || 400} words maximum (about 2-3 minutes spoken)
- Natural transitions between stories
- No markdown formatting — plain spoken text
- Start with a brief greeting and end with a sign-off
- Reference sources naturally ("according to...", "reports indicate...")

Summary to convert:
${input.summary}`
}

export { buildSummaryPrompt, buildScriptPrompt }
