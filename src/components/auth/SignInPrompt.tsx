"use client"

import { SignInButtons } from "./SignInButtons"

interface SignInPromptProps {
  action: string
}

export function SignInPrompt({ action }: SignInPromptProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-8 text-center">
      <h3 className="text-lg font-semibold mb-2">Sign in to {action}</h3>
      <p className="text-gray-600 mb-4">
        Create an account or sign in to continue.
      </p>
      <div className="flex justify-center">
        <SignInButtons />
      </div>
    </div>
  )
}
