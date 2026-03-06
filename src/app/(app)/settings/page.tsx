"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function SettingsPage() {
  const [stripeConnected, setStripeConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkStripeStatus()
  }, [])

  async function checkStripeStatus() {
    try {
      const res = await fetch("/api/stripe/account-status")
      if (res.ok) {
        const data = await res.json()
        setStripeConnected(data.complete)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Profile Link */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold mb-1">Profile</h2>
          <p className="text-sm text-gray-600 mb-3">Edit your display name, avatar, and wallet address.</p>
          <Link href="/profile" className="text-sm text-blue-600 hover:underline">
            Edit Profile &rarr;
          </Link>
        </section>

        {/* Stripe Connect */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold mb-1">Payments</h2>
          {loading ? (
            <div className="animate-pulse h-6 bg-gray-100 rounded w-48" />
          ) : stripeConnected ? (
            <div>
              <p className="text-sm text-green-600 mb-1">Stripe account connected</p>
              <p className="text-xs text-gray-500">You can set prices on your feeds and receive payments from subscribers.</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Connect your Stripe account to monetize your feeds and receive subscriber payments.
              </p>
              <Link href="/stripe/connect" className="text-sm text-blue-600 hover:underline">
                Connect Stripe &rarr;
              </Link>
            </div>
          )}
        </section>

        {/* Data */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold mb-1">Feeds</h2>
          <p className="text-sm text-gray-600 mb-3">Manage your feeds, sources, and video settings.</p>
          <Link href="/feeds" className="text-sm text-blue-600 hover:underline">
            Manage Feeds &rarr;
          </Link>
        </section>

        {/* Account */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold mb-1">Account</h2>
          <p className="text-sm text-gray-600">
            To delete your account or download your data, please contact support.
          </p>
        </section>
      </div>
    </div>
  )
}
