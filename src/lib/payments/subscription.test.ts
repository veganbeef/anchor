import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    selectFrom: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn(),
    executeTakeFirstOrThrow: vi.fn(),
  },
}))

import { checkFeedAccess } from "./subscription"
import { db } from "@/lib/db"

describe("checkFeedAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("grants access to free feeds", async () => {
    const mockDb = db as any
    mockDb.selectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
            subscription_price_usd: "0.00",
            per_video_price_usd: "0.00",
            user_id: "owner-1",
            is_public: true,
          }),
        }),
      }),
    })

    const result = await checkFeedAccess("user-1", "feed-1")
    expect(result.hasAccess).toBe(true)
    expect(result.reason).toBe("free")
  })

  it("grants access to feed owner", async () => {
    const mockDb = db as any
    mockDb.selectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
            subscription_price_usd: "9.99",
            per_video_price_usd: "0.00",
            user_id: "owner-1",
            is_public: true,
          }),
        }),
      }),
    })

    const result = await checkFeedAccess("owner-1", "feed-1")
    expect(result.hasAccess).toBe(true)
    expect(result.reason).toBe("owner")
  })

  it("denies access to unauthenticated user for paid feed", async () => {
    const mockDb = db as any
    mockDb.selectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
            subscription_price_usd: "9.99",
            per_video_price_usd: "0.00",
            user_id: "owner-1",
            is_public: true,
          }),
        }),
      }),
    })

    const result = await checkFeedAccess(null, "feed-1")
    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe("auth_required")
  })
})
