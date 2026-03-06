import Link from "next/link"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">Anchor</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
            <Link href="/feeds" className="hover:text-blue-600">Feeds</Link>
            <Link href="/sources" className="hover:text-blue-600">Sources</Link>
            <Link href="/profile" className="hover:text-blue-600">Profile</Link>
            <Link href="/settings" className="hover:text-blue-600">Settings</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
