"use client"

import { ReactNode } from "react"

function NeynarWrapper({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID) {
    return <>{children}</>
  }

  try {
    const { NeynarContextProvider } = require("@neynar/react")
    return (
      <NeynarContextProvider
        settings={{ clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID! }}
      >
        {children}
      </NeynarContextProvider>
    )
  } catch {
    return <>{children}</>
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  return <NeynarWrapper>{children}</NeynarWrapper>
}
