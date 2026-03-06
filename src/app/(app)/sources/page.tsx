"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Source {
  id: string
  type: string
  name: string
  identifier: string
  description: string | null
  is_active: boolean
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState("email")
  const [newIdentifier, setNewIdentifier] = useState("")
  const [newDescription, setNewDescription] = useState("")

  useEffect(() => {
    loadSources()
  }, [typeFilter, search])

  async function loadSources() {
    const params = new URLSearchParams()
    if (typeFilter) params.set("type", typeFilter)
    if (search) params.set("q", search)
    const res = await fetch(`/api/sources?${params}`)
    const data = await res.json()
    setSources(data.sources || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newIdentifier.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          type: newType,
          identifier: newIdentifier.trim(),
          description: newDescription.trim() || undefined,
        }),
      })
      if (res.ok) {
        setNewName("")
        setNewIdentifier("")
        setNewDescription("")
        setShowCreate(false)
        await loadSources()
      }
    } finally {
      setCreating(false)
    }
  }

  const sourceTypes = ["email", "podcast", "twitter", "farcaster"]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sources</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/sources/discover"
            className="text-sm text-gray-500 hover:text-blue-600 border border-gray-300 px-3 py-2 rounded-lg"
          >
            Discover
          </Link>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            {showCreate ? "Cancel" : "Add Source"}
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="TechCrunch Newsletter"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {sourceTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Identifier</label>
              <input
                type="text"
                value={newIdentifier}
                onChange={(e) => setNewIdentifier(e.target.value)}
                placeholder="newsletter@techcrunch.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Email: sender address. Podcast: RSS URL. Twitter: @handle. Farcaster: FID or channel.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Daily tech news digest"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !newName.trim() || !newIdentifier.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {creating ? "Creating..." : "Create Source"}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sources..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All types</option>
          {sourceTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : sources.length > 0 ? (
        <div className="space-y-2">
          {sources.map((source) => (
            <div key={source.id} className="rounded-lg border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{source.name}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-gray-100 rounded capitalize">{source.type}</span>
                  <span>{source.identifier}</span>
                </div>
                {source.description && (
                  <p className="text-sm text-gray-600 mt-1">{source.description}</p>
                )}
              </div>
              <span className={`text-xs ${source.is_active ? "text-green-600" : "text-gray-400"}`}>
                {source.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">
          No sources found. Add a source or try{" "}
          <Link href="/sources/discover" className="text-blue-600 hover:underline">
            AI discovery
          </Link>.
        </p>
      )}
    </div>
  )
}
