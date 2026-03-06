"use client"

import { useState } from "react"

interface SubscribeButtonProps {
  feedId: string
  priceUsd: number
  label?: string
}

export function SubscribeButton({ feedId, priceUsd, label }: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    try {
      const response = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Subscribe error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "Loading..." : label || `Subscribe $${priceUsd}/mo`}
    </button>
  )
}
