"use client"

interface DashboardStats {
  totalUsers: number
  activeFeeds: number
  totalVideos: number
  totalRevenue: number
}

export function DashboardCharts({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Users" value={stats.totalUsers} />
      <StatCard label="Active Feeds" value={stats.activeFeeds} />
      <StatCard label="Total Videos" value={stats.totalVideos} />
      <StatCard label="Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}
