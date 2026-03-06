"use client"

import { useState } from "react"

interface PurchaseButtonProps {
  feedId: string
  videoId: string
  priceUsd: number
}

export function PurchaseButton({ feedId, videoId, priceUsd }: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handlePurchase() {
    setLoading(true)
    try {
      const response = await fetch("/api/payments/purchase-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId, videoId }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Purchase error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePurchase}
      disabled={loading}
      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "Loading..." : `Buy $${priceUsd}`}
    </button>
  )
}
