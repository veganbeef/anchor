"use client"

import { useEffect, useState } from "react"

interface User {
  id: string
  fid: number | null
  email: string | null
  username: string | null
  display_name: string | null
  auth_method: string
  is_admin: boolean
  stripe_onboarding_complete: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const res = await fetch("/api/admin/users")
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users || [])
    }
    setLoading(false)
  }

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.display_name?.toLowerCase().includes(q) ||
      String(u.fid).includes(q)
    )
  })

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">User Management</h1>
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
        <h1 className="text-2xl font-bold">User Management</h1>
        <span className="text-sm text-gray-500">{users.length} users</span>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 font-medium">User</th>
              <th className="pb-2 font-medium">Auth</th>
              <th className="pb-2 font-medium">FID</th>
              <th className="pb-2 font-medium">Stripe</th>
              <th className="pb-2 font-medium">Admin</th>
              <th className="pb-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b border-gray-100">
                <td className="py-3">
                  <p className="font-medium">{user.display_name || "—"}</p>
                  <p className="text-xs text-gray-500">
                    {user.username ? `@${user.username}` : user.email || user.id.slice(0, 8)}
                  </p>
                </td>
                <td className="py-3 capitalize">{user.auth_method}</td>
                <td className="py-3">{user.fid || "—"}</td>
                <td className="py-3">
                  <span className={user.stripe_onboarding_complete ? "text-green-600" : "text-gray-400"}>
                    {user.stripe_onboarding_complete ? "Connected" : "—"}
                  </span>
                </td>
                <td className="py-3">
                  {user.is_admin && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Admin</span>}
                </td>
                <td className="py-3 text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-center py-8">No users found.</p>
      )}
    </div>
  )
}
