"use client"

import { useState } from "react"

interface Suggestion {
  name: string
  type: string
  identifier: string
  description: string
}

export default function DiscoverSourcesPage() {
  const [topic, setTopic] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  async function handleDiscover(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    setSuggestions([])
    try {
      const res = await fetch("/api/sources/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(suggestion: Suggestion) {
    setAdding(suggestion.identifier)
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestion.name,
          type: suggestion.type,
          identifier: suggestion.identifier,
          description: suggestion.description,
        }),
      })
      if (res.ok) {
        setAdded((prev) => new Set(prev).add(suggestion.identifier))
      }
    } finally {
      setAdding(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Discover Sources</h1>
      <p className="text-gray-600 mb-6">
        Enter a topic and AI will suggest relevant newsletters, podcasts, and other sources.
      </p>

      <form onSubmit={handleDiscover} className="flex gap-3 mb-8">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., AI and machine learning, crypto markets, climate tech..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          required
        />
        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm whitespace-nowrap"
        >
          {loading ? "Discovering..." : "Discover"}
        </button>
      </form>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Suggestions</h2>
          {suggestions.map((suggestion) => (
            <div key={suggestion.identifier} className="rounded-lg border border-gray-200 p-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{suggestion.name}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-gray-100 rounded capitalize">{suggestion.type}</span>
                  <span>{suggestion.identifier}</span>
                </div>
                {suggestion.description && (
                  <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                )}
              </div>
              <button
                onClick={() => handleAdd(suggestion)}
                disabled={adding === suggestion.identifier || added.has(suggestion.identifier)}
                className="ml-4 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                {added.has(suggestion.identifier) ? "Added" : adding === suggestion.identifier ? "Adding..." : "Add Source"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && suggestions.length === 0 && topic && (
        <p className="text-gray-500 text-center py-8">
          Enter a topic above and click Discover to get AI-powered source suggestions.
        </p>
      )}
    </div>
  )
}
