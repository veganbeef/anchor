"use client"

import { useEffect, useState } from "react"
import { RefundDialog } from "@/components/admin/RefundDialog"

interface Payment {
  id: string
  type: string
  payer_id: string
  recipient_id: string | null
  feed_id: string | null
  video_id: string | null
  amount_usd: string
  platform_fee_usd: string | null
  payment_method: string | null
  status: string
  refunded_at: string | null
  refund_reason: string | null
  created_at: string
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("")

  useEffect(() => {
    loadPayments()
  }, [])

  async function loadPayments() {
    const res = await fetch("/api/admin/payments")
    if (res.ok) {
      const data = await res.json()
      setPayments(data.payments || [])
    }
    setLoading(false)
  }

  const filtered = typeFilter ? payments.filter((p) => p.type === typeFilter) : payments
  const totalRevenue = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + Number(p.amount_usd), 0)
  const totalFees = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + Number(p.platform_fee_usd || 0), 0)

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Payments & Refunds</h1>
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
        <h1 className="text-2xl font-bold">Payments & Refunds</h1>
        <span className="text-sm text-gray-500">{payments.length} transactions</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Platform Fees (5%)</p>
          <p className="text-2xl font-bold">${totalFees.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Refunded</p>
          <p className="text-2xl font-bold text-red-600">
            {payments.filter((p) => p.status === "refunded").length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["", "platform_subscription", "user_subscription", "video_purchase"].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded text-sm ${
              typeFilter === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t ? t.replace(/_/g, " ") : "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Fee</th>
              <th className="pb-2 font-medium">Method</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((payment) => (
              <tr key={payment.id} className="border-b border-gray-100">
                <td className="py-3 text-gray-600">
                  {new Date(payment.created_at).toLocaleDateString()}
                </td>
                <td className="py-3">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    {payment.type.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="py-3 font-medium">${Number(payment.amount_usd).toFixed(2)}</td>
                <td className="py-3 text-gray-500">
                  {payment.platform_fee_usd ? `$${Number(payment.platform_fee_usd).toFixed(2)}` : "—"}
                </td>
                <td className="py-3 capitalize">{payment.payment_method || "—"}</td>
                <td className="py-3">
                  <span
                    className={`text-xs font-medium ${
                      payment.status === "completed" ? "text-green-600" :
                      payment.status === "refunded" ? "text-red-600" :
                      "text-yellow-600"
                    }`}
                  >
                    {payment.status}
                  </span>
                  {payment.refund_reason && (
                    <p className="text-xs text-gray-400 mt-0.5">{payment.refund_reason}</p>
                  )}
                </td>
                <td className="py-3">
                  {payment.status === "completed" && (
                    <RefundDialog
                      paymentId={payment.id}
                      amount={Number(payment.amount_usd)}
                      onRefunded={loadPayments}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-center py-8">No payments found.</p>
      )}
    </div>
  )
}
