import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/middleware"
import { getSummarizationProvider } from "@/lib/ai/factory"

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { topic } = await request.json()
  if (!topic) return NextResponse.json({ error: "Topic required" }, { status: 400 })

  const provider = await getSummarizationProvider()
  const suggestions = await provider.generateSummary({
    contentItems: [],
    feedName: topic,
    previousSummaries: [`Suggest 5-10 newsletters/podcasts/Twitter accounts about "${topic}". Return as JSON array with fields: name, type (email|podcast|twitter|farcaster), identifier, description.`],
  })

  return NextResponse.json({ suggestions })
}
