"use client"

import { useState } from "react"

export function GenerateButton({ feedId }: { feedId: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleGenerate() {
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch(`/api/feeds/${feedId}/generate`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setMessage("Generation triggered!")
      } else {
        setMessage(data.error || "Failed to trigger generation")
      }
    } catch {
      setMessage("Failed to trigger generation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
      >
        {loading ? "Generating..." : "Generate Now"}
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </div>
  )
}
