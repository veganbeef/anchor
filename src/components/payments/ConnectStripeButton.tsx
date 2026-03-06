"use client"

import { useState } from "react"

export function ConnectStripeButton() {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const response = await fetch("/api/stripe/connect", { method: "POST" })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Connect error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "Loading..." : "Connect Stripe Account"}
    </button>
  )
}
