import type { Metadata } from "next"
import { AppProvider } from "@/components/providers/AppProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Anchor — AI News Aggregation",
  description: "Multi-source news aggregation with AI-generated video summaries",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
