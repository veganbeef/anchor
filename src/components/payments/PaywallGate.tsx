"use client"

import { ReactNode, useEffect, useState } from "react"
import { SubscribeButton } from "./SubscribeButton"
import { SignInPrompt } from "@/components/auth/SignInPrompt"

interface PaywallGateProps {
  feedId: string
  children: ReactNode
  subscriptionPriceUsd?: number
  perVideoPriceUsd?: number
}

export function PaywallGate({ feedId, children, subscriptionPriceUsd, perVideoPriceUsd }: PaywallGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [reason, setReason] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/payments/access/${feedId}`)
      .then((r) => r.json())
      .then((data) => {
        setHasAccess(data.hasAccess)
        setReason(data.reason)
      })
      .catch(() => setHasAccess(false))
  }, [feedId])

  if (hasAccess === null) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-48" />
  }

  if (hasAccess) {
    return <>{children}</>
  }

  if (reason === "auth_required") {
    return <SignInPrompt action="access this content" />
  }

  return (
    <div className="rounded-lg border border-gray-200 p-8 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-lg font-semibold mb-2">This content is premium</h3>
      <p className="text-gray-600 mb-4">
        {subscriptionPriceUsd && subscriptionPriceUsd > 0
          ? `Subscribe for $${subscriptionPriceUsd}/month to access all content.`
          : perVideoPriceUsd && perVideoPriceUsd > 0
            ? `Purchase individual videos for $${perVideoPriceUsd} each.`
            : "Sign in to access this content."}
      </p>
      {subscriptionPriceUsd && subscriptionPriceUsd > 0 && (
        <SubscribeButton feedId={feedId} priceUsd={subscriptionPriceUsd} />
      )}
    </div>
  )
}
