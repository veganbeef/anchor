"use client"

import { signIn } from "next-auth/react"
import { useCallback } from "react"

export function SignInButtons() {
  const handleGoogleSignIn = useCallback(() => {
    signIn("google")
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleGoogleSignIn}
        className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Sign in with Google
      </button>
      <NeynarSignInButton />
    </div>
  )
}

function NeynarSignInButton() {
  if (!process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID) {
    return null
  }

  return <FarcasterButtonWrapper />
}

function FarcasterButtonWrapper() {
  // Dynamic import to avoid errors when @neynar/react is not configured
  try {
    const { NeynarAuthButton } = require("@neynar/react")

    const handleSuccess = async (data: { signer_uuid: string; fid: number; fname: string; display_name: string; pfp_url: string }) => {
      await fetch("/api/auth/farcaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: data.signer_uuid,
          profile: {
            username: data.fname,
            displayName: data.display_name,
            avatarUrl: data.pfp_url,
          },
        }),
      })
      window.location.reload()
    }

    return <NeynarAuthButton onSuccess={handleSuccess} />
  } catch {
    return null
  }
}
