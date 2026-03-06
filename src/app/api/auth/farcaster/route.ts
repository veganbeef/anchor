import { NextRequest, NextResponse } from "next/server"
import { verifyFarcasterToken, findOrCreateFarcasterUser } from "@/lib/auth/farcaster"

export async function POST(request: NextRequest) {
  try {
    const { token, profile } = await request.json()

    const verified = await verifyFarcasterToken(token)
    if (!verified) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const user = await findOrCreateFarcasterUser(verified.fid, {
      username: profile?.username || `fid-${verified.fid}`,
      displayName: profile?.displayName || `User ${verified.fid}`,
      avatarUrl: profile?.avatarUrl || "",
      walletAddress: profile?.walletAddress,
    })

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ error: "Auth failed" }, { status: 500 })
  }
}
