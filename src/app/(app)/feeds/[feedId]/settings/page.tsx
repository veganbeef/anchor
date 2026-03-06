"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ConnectStripeButton } from "@/components/payments/ConnectStripeButton"

interface Feed {
  id: string
  name: string
  description: string | null
  summary_hour: number
  timezone: string
  video_enabled: boolean
  video_provider: string | null
  is_public: boolean
  subscription_price_usd: string | null
  per_video_price_usd: string | null
}

interface Source {
  id: string
  feed_source_id: string
  priority: number
  name: string
  type: string
  identifier: string
}

export default function FeedSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const feedId = params.feedId as string

  const [feed, setFeed] = useState<Feed | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [allSources, setAllSources] = useState<Array<{ id: string; name: string; type: string; identifier: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<"sources" | "pricing" | "schedule" | "video">("sources")
  const [stripeConnected, setStripeConnected] = useState(false)
  const [scheduleMessage, setScheduleMessage] = useState("")

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [summaryHour, setSummaryHour] = useState(9)
  const [timezone, setTimezone] = useState("America/Los_Angeles")
  const [isPublic, setIsPublic] = useState(true)
  const [videoProvider, setVideoProvider] = useState("d-id")
  const [subscriptionPrice, setSubscriptionPrice] = useState("0")
  const [perVideoPrice, setPerVideoPrice] = useState("0")

  useEffect(() => {
    loadFeed()
    loadSources()
    loadAllSources()
    checkStripeStatus()
  }, [feedId])

  async function loadFeed() {
    const res = await fetch(`/api/feeds/${feedId}`)
    if (!res.ok) { router.push("/feeds"); return }
    const data = await res.json()
    const f = data.feed
    setFeed(f)
    setName(f.name)
    setDescription(f.description || "")
    setSummaryHour(f.summary_hour)
    setTimezone(f.timezone)
    setIsPublic(f.is_public)
    setVideoProvider(f.video_provider || "d-id")
    setSubscriptionPrice(String(Number(f.subscription_price_usd) || 0))
    setPerVideoPrice(String(Number(f.per_video_price_usd) || 0))
    setLoading(false)
  }

  async function loadSources() {
    const res = await fetch(`/api/feeds/${feedId}/sources`)
    if (res.ok) {
      const data = await res.json()
      setSources(data.sources || [])
    }
  }

  async function loadAllSources() {
    const res = await fetch("/api/sources")
    if (res.ok) {
      const data = await res.json()
      setAllSources(data.sources || [])
    }
  }

  async function checkStripeStatus() {
    const res = await fetch("/api/stripe/account-status")
    if (res.ok) {
      const data = await res.json()
      setStripeConnected(data.complete)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          summaryHour,
          timezone,
          isPublic,
          videoProvider,
          subscriptionPriceUsd: Number(subscriptionPrice),
          perVideoPriceUsd: Number(perVideoPrice),
        }),
      })
      if (res.ok) {
        if (summaryHour !== feed?.summary_hour) {
          setScheduleMessage(`Schedule updated. Your next report will generate at ${summaryHour}:00 tomorrow. Reports only run once per day.`)
        }
        await loadFeed()
      }
    } finally {
      setSaving(false)
    }
  }

  async function addSource(sourceId: string) {
    await fetch(`/api/feeds/${feedId}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    })
    await loadSources()
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Feed Settings</h1>
        <div className="animate-pulse h-48 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  const addedSourceIds = new Set(sources.map((s) => s.id))
  const availableSources = allSources.filter((s) => !addedSourceIds.has(s.id))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/feeds/${feedId}`} className="text-sm text-gray-500 hover:text-blue-600">
            &larr; Back to feed
          </Link>
          <h1 className="text-2xl font-bold mt-1">Feed Settings</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* General */}
      <div className="rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feed Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <select
              value={isPublic ? "public" : "private"}
              onChange={(e) => setIsPublic(e.target.value === "public")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none h-20"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(["sources", "schedule", "pricing", "video"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${
              tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Sources Tab */}
      {tab === "sources" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Sources are private — only you can see which sources power this feed.
          </p>
          {sources.length > 0 ? (
            <div className="space-y-2">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between rounded border border-gray-200 p-3">
                  <div>
                    <p className="font-medium text-sm">{source.name}</p>
                    <p className="text-xs text-gray-500">{source.type} — {source.identifier}</p>
                  </div>
                  <span className="text-xs text-gray-400">Priority: {source.priority}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No sources added yet.</p>
          )}

          {availableSources.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Add Source</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableSources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between rounded border border-gray-200 p-3">
                    <div>
                      <p className="font-medium text-sm">{source.name}</p>
                      <p className="text-xs text-gray-500">{source.type} — {source.identifier}</p>
                    </div>
                    <button
                      onClick={() => addSource(source.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link href="/sources" className="inline-block text-sm text-blue-600 hover:underline">
            Browse all sources &rarr;
          </Link>
        </div>
      )}

      {/* Schedule Tab */}
      {tab === "schedule" && (
        <div className="space-y-4">
          {scheduleMessage && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              {scheduleMessage}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generation Hour</label>
              <select
                value={summaryHour}
                onChange={(e) => setSummaryHour(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "UTC", "Europe/London", "Europe/Berlin", "Asia/Tokyo"].map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Reports are generated once per day at the selected time. Changing the schedule takes effect the next day.
          </p>
        </div>
      )}

      {/* Pricing Tab */}
      {tab === "pricing" && (
        <div className="space-y-4">
          {!stripeConnected ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800 mb-3">
                Connect your Stripe account to set prices and receive payments from subscribers.
              </p>
              <ConnectStripeButton />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Subscription (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={subscriptionPrice}
                    onChange={(e) => setSubscriptionPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set to 0 for free access</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Per-Video Price (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={perVideoPrice}
                    onChange={(e) => setPerVideoPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set to 0 to disable per-video purchases</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                You receive 95% of all payments. The platform takes a 5% fee.
              </p>
            </>
          )}
        </div>
      )}

      {/* Video Tab */}
      {tab === "video" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video Provider</label>
            <select
              value={videoProvider}
              onChange={(e) => setVideoProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm max-w-xs"
            >
              <option value="d-id">D-ID</option>
              <option value="a2e">A2E</option>
              <option value="heygen">HeyGen</option>
              <option value="synthesia">Synthesia</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Different providers offer different avatar styles and pricing. D-ID and A2E are currently supported.
          </p>
        </div>
      )}
    </div>
  )
}
