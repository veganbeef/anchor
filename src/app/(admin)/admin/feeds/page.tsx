"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Feed {
  id: string
  name: string
  description: string | null
  user_id: string
  owner_username: string
  owner_display_name: string
  is_active: boolean
  is_public: boolean
  summary_hour: number
  timezone: string
  last_run_date: string | null
  video_provider: string | null
  video_enabled: boolean
  subscription_price_usd: string | null
  created_at: string
}

export default function AdminFeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadFeeds()
  }, [])

  async function loadFeeds() {
    const res = await fetch("/api/admin/feeds")
    if (res.ok) {
      const data = await res.json()
      setFeeds(data.feeds || [])
    }
    setLoading(false)
  }

  const filtered = feeds.filter((f) => {
    if (!search) return true
    const q = search.toLowerCase()
    return f.name.toLowerCase().includes(q) || f.owner_username?.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Feeds Health</h1>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Feeds Health</h1>
        <span className="text-sm text-gray-500">{feeds.length} feeds</span>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search feeds..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">Feed</th>
              <th className="pb-2 font-medium">Owner</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Schedule</th>
              <th className="pb-2 font-medium">Last Run</th>
              <th className="pb-2 font-medium">Video</th>
              <th className="pb-2 font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((feed) => (
              <tr key={feed.id} className="border-b border-gray-100">
                <td className="py-3">
                  <p className="font-medium">{feed.name}</p>
                  <p className="text-xs text-gray-500">{feed.id.slice(0, 8)}...</p>
                </td>
                <td className="py-3">
                  <Link href={`/u/${feed.owner_username}`} className="text-blue-600 hover:underline">
                    @{feed.owner_username}
                  </Link>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${feed.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                    <span>{feed.is_active ? "Active" : "Inactive"}</span>
                    {feed.is_public && <span className="text-xs text-gray-400">(public)</span>}
                  </div>
                </td>
                <td className="py-3 text-gray-600">
                  {feed.summary_hour}:00 {feed.timezone.split("/").pop()}
                </td>
                <td className="py-3">
                  {feed.last_run_date ? (
                    <span className="text-gray-600">{feed.last_run_date}</span>
                  ) : (
                    <span className="text-gray-400">Never</span>
                  )}
                </td>
                <td className="py-3 uppercase text-xs">{feed.video_provider || "—"}</td>
                <td className="py-3">
                  {Number(feed.subscription_price_usd) > 0 ? (
                    <span className="text-green-600">${Number(feed.subscription_price_usd)}/mo</span>
                  ) : (
                    <span className="text-gray-400">Free</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-center py-8">No feeds found.</p>
      )}
    </div>
  )
}
