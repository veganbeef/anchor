interface ServiceHealthProps {
  ingestion: Array<{ type: string; last_fetched: string | null }>
  videoQueue: { pending: number; failed: number }
}

export function ServiceHealth({ ingestion, videoQueue }: ServiceHealthProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Ingestion Status</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ingestion.map((source) => (
          <div key={source.type} className="rounded border p-3">
            <p className="font-medium capitalize">{source.type}</p>
            <p className="text-sm text-gray-500">
              {source.last_fetched
                ? `Last: ${new Date(source.last_fetched).toLocaleString()}`
                : "Never fetched"}
            </p>
          </div>
        ))}
      </div>
      <h3 className="font-semibold text-lg mt-6">Video Queue</h3>
      <div className="flex gap-4">
        <div className="rounded border p-3">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-xl font-bold">{videoQueue.pending}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-xl font-bold text-red-600">{videoQueue.failed}</p>
        </div>
      </div>
    </div>
  )
}
