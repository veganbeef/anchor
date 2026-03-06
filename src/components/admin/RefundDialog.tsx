"use client"

import { useState } from "react"

interface RefundDialogProps {
  paymentId: string
  amount: number
  onRefunded: () => void
}

export function RefundDialog({ paymentId, amount, onRefunded }: RefundDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleRefund() {
    if (!reason.trim()) return
    setLoading(true)
    try {
      const response = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, reason }),
      })
      if (response.ok) {
        setOpen(false)
        onRefunded()
      }
    } catch (error) {
      console.error("Refund error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-red-600 hover:text-red-800 text-sm"
      >
        Refund
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold">Refund ${amount.toFixed(2)}</h3>
        <p className="text-sm text-gray-600 mt-1">This action cannot be undone.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for refund (required)"
          className="w-full mt-4 p-2 border rounded-lg resize-none h-24"
        />
        <div className="flex gap-2 mt-4 justify-end">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={loading || !reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm Refund"}
          </button>
        </div>
      </div>
    </div>
  )
}
