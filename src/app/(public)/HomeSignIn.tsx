"use client"

import { useEffect, useState } from "react"
import { SignInButtons } from "@/components/auth/SignInButtons"

export function HomeSignIn() {
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    // Check for session cookie (next-auth sets __Secure-next-auth.session-token or next-auth.session-token)
    const hasSession =
      document.cookie.includes("next-auth.session-token") ||
      document.cookie.includes("__Secure-next-auth.session-token")
    setIsGuest(!hasSession)
  }, [])

  if (!isGuest) return null

  return (
    <div className="mt-4">
      <SignInButtons />
    </div>
  )
}
