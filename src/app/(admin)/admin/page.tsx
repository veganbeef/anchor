"use client"

import { useEffect, useState } from "react"
import { DashboardCharts } from "@/components/admin/DashboardCharts"
import Link from "next/link"

interface PinnedFeed {
  id: string
  feed_id: string
  sort_order: number
  feed_name: string
  owner_username: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalUsers: 0, activeFeeds: 0, totalVideos: 0, totalRevenue: 0 })
  const [pinnedFeeds, setPinnedFeeds] = useState<PinnedFeed[]>([])
  const [loading, setLoading] = useState(true)
  const [pinFeedId, setPinFeedId] = useState("")
  const [pinning, setPinning] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [statsRes, pinnedRes] = await Promise.all([
      fetch("/api/admin/dashboard"),
      fetch("/api/admin/pinned-feeds"),
    ])
    if (statsRes.ok) setStats(await statsRes.json())
    if (pinnedRes.ok) {
      const data = await pinnedRes.json()
      setPinnedFeeds(data.pinnedFeeds || [])
    }
    setLoading(false)
  }

  async function handlePin() {
    if (!pinFeedId.trim()) return
    setPinning(true)
    try {
      const nextOrder = pinnedFeeds.length > 0
        ? Math.max(...pinnedFeeds.map((f) => f.sort_order)) + 1
        : 0
      await fetch("/api/admin/pinned-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId: pinFeedId.trim(), sortOrder: nextOrder }),
      })
      setPinFeedId("")
      await loadData()
    } finally {
      setPinning(false)
    }
  }

  async function handleUnpin(pinnedId: string) {
    await fetch(`/api/admin/pinned-feeds/${pinnedId}`, { method: "DELETE" })
    await loadData()
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <DashboardCharts stats={stats} />

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        {/* Quick Links */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold mb-3">Quick Links</h2>
          <div className="space-y-2 text-sm">
            <Link href="/admin/users" className="block text-blue-600 hover:underline">User Management</Link>
            <Link href="/admin/feeds" className="block text-blue-600 hover:underline">Feeds Health</Link>
            <Link href="/admin/payments" className="block text-blue-600 hover:underline">Payments & Refunds</Link>
            <Link href="/admin/services" className="block text-blue-600 hover:underline">Service Health</Link>
          </div>
        </section>

        {/* Pinned Feeds */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold mb-3">Pinned Homepage Feeds</h2>
          {pinnedFeeds.length > 0 ? (
            <div className="space-y-2 mb-3">
              {pinnedFeeds.map((pf) => (
                <div key={pf.id} className="flex items-center justify-between text-sm border border-gray-100 rounded p-2">
                  <div>
                    <span className="font-medium">{pf.feed_name}</span>
                    <span className="text-gray-500 ml-2">by @{pf.owner_username}</span>
                  </div>
                  <button onClick={() => handleUnpin(pf.id)} className="text-red-500 hover:text-red-700 text-xs">
                    Unpin
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3">No feeds pinned to homepage.</p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={pinFeedId}
              onChange={(e) => setPinFeedId(e.target.value)}
              placeholder="Feed ID to pin"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={handlePin}
              disabled={pinning || !pinFeedId.trim()}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {pinning ? "..." : "Pin"}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
