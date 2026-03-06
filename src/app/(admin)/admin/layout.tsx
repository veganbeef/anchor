import Link from "next/link"
import { getServerUser } from "@/lib/auth/middleware"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()
  if (!user || !user.isAdmin) redirect("/")

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-200 px-4 py-3 bg-gray-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-lg">Anchor</Link>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="hover:text-blue-600">Overview</Link>
            <Link href="/admin/users" className="hover:text-blue-600">Users</Link>
            <Link href="/admin/feeds" className="hover:text-blue-600">Feeds</Link>
            <Link href="/admin/payments" className="hover:text-blue-600">Payments</Link>
            <Link href="/admin/services" className="hover:text-blue-600">Services</Link>
            <Link href="/dashboard" className="text-gray-400 hover:text-blue-600">Exit Admin</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
