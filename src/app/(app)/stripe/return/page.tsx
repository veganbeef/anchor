"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function StripeReturnPage() {
  const [status, setStatus] = useState<"loading" | "complete" | "incomplete">("loading")

  useEffect(() => {
    checkStatus()
  }, [])

  async function checkStatus() {
    const res = await fetch("/api/stripe/account-status")
    if (res.ok) {
      const data = await res.json()
      setStatus(data.complete ? "complete" : "incomplete")
    } else {
      setStatus("incomplete")
    }
  }

  if (status === "loading") {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Checking Stripe Status...</h1>
        <div className="animate-pulse h-6 bg-gray-100 rounded w-48 mx-auto" />
      </div>
    )
  }

  if (status === "incomplete") {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Onboarding Incomplete</h1>
        <p className="text-gray-600 mb-6">
          Your Stripe account setup isn&apos;t complete yet. Please finish the onboarding process.
        </p>
        <Link href="/stripe/connect" className="text-blue-600 hover:underline">
          Continue Setup
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <h1 className="text-2xl font-bold mb-4">Stripe Account Connected</h1>
      <p className="text-gray-600 mb-6">
        Your Stripe account has been connected successfully. You can now set prices on your feeds.
      </p>
      <Link href="/feeds" className="text-blue-600 hover:underline">
        Go to your feeds
      </Link>
    </div>
  )
}
