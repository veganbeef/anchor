"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Feed {
  id: string
  name: string
  description: string | null
  is_public: boolean
  is_active: boolean
  subscription_price_usd: string | null
  per_video_price_usd: string | null
  video_provider: string | null
  summary_hour: number
  timezone: string
  created_at: string
}

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    loadFeeds()
  }, [])

  async function loadFeeds() {
    const res = await fetch("/api/feeds")
    const data = await res.json()
    setFeeds(data.feeds || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      })
      if (res.ok) {
        setName("")
        setDescription("")
        setShowCreate(false)
        await loadFeeds()
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(feedId: string) {
    if (!confirm("Delete this feed? This cannot be undone.")) return
    await fetch(`/api/feeds/${feedId}`, { method: "DELETE" })
    await loadFeeds()
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">My Feeds</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Feeds</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          {showCreate ? "Cancel" : "Create Feed"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-gray-200 p-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Daily Tech News"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A daily summary of the latest tech news..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none h-20"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {creating ? "Creating..." : "Create Feed"}
            </button>
          </div>
        </form>
      )}

      {feeds.length > 0 ? (
        <div className="space-y-3">
          {feeds.map((feed) => (
            <div key={feed.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <Link href={`/feeds/${feed.id}`} className="font-semibold hover:text-blue-600">
                    {feed.name}
                  </Link>
                  {feed.description && (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{feed.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className={feed.is_active ? "text-green-600" : "text-red-600"}>
                      {feed.is_active ? "Active" : "Inactive"}
                    </span>
                    <span>{feed.is_public ? "Public" : "Private"}</span>
                    <span>{feed.timezone} at {feed.summary_hour}:00</span>
                    {Number(feed.subscription_price_usd) > 0 && (
                      <span className="text-green-600">${Number(feed.subscription_price_usd)}/mo</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/feeds/${feed.id}/settings`}
                    className="text-sm text-gray-500 hover:text-blue-600"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">
            No feeds yet. Create your first feed to start generating daily video summaries.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Your First Feed
          </button>
        </div>
      )}
    </div>
  )
}
