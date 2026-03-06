"use client"

import { useEffect, useState } from "react"
import { ServiceHealth } from "@/components/admin/ServiceHealth"

interface IngestionSource {
  type: string
  last_fetched: string | null
}

interface ServiceData {
  ingestion: IngestionSource[]
  videoQueue: { pending: number; failed: number }
}

export default function AdminServicesPage() {
  const [data, setData] = useState<ServiceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadServices()
  }, [])

  async function loadServices() {
    const res = await fetch("/api/admin/services")
    if (res.ok) {
      setData(await res.json())
    }
    setLoading(false)
  }

  if (loading || !data) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Service Health</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded" />
            ))}
          </div>
          <div className="h-20 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Service Health</h1>
        <button
          onClick={loadServices}
          className="text-sm text-gray-500 hover:text-blue-600 border border-gray-300 px-3 py-1.5 rounded"
        >
          Refresh
        </button>
      </div>

      <ServiceHealth ingestion={data.ingestion} videoQueue={data.videoQueue} />

      {/* External Dashboards */}
      <section className="mt-8">
        <h3 className="font-semibold text-lg mb-3">External Dashboards</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <a
            href="https://app.inngest.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-200 p-4 hover:border-gray-400 transition-colors"
          >
            <p className="font-medium">Inngest</p>
            <p className="text-sm text-gray-500">Pipeline traces and step timing</p>
          </a>
          <a
            href="https://sentry.io"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-200 p-4 hover:border-gray-400 transition-colors"
          >
            <p className="font-medium">Sentry</p>
            <p className="text-sm text-gray-500">Error tracking and performance</p>
          </a>
          <a
            href="https://app.axiom.co"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-200 p-4 hover:border-gray-400 transition-colors"
          >
            <p className="font-medium">Axiom</p>
            <p className="text-sm text-gray-500">Structured logs and dashboards</p>
          </a>
        </div>
      </section>
    </div>
  )
}
