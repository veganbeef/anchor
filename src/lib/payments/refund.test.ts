import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("./stripe", () => ({
  stripe: {
    refunds: { create: vi.fn().mockResolvedValue({}) },
    subscriptions: { cancel: vi.fn().mockResolvedValue({}) },
  },
}))

vi.mock("@/lib/db", () => {
  const chain: any = {}
  chain.selectFrom = vi.fn().mockReturnValue(chain)
  chain.updateTable = vi.fn().mockReturnValue(chain)
  chain.deleteFrom = vi.fn().mockReturnValue(chain)
  chain.insertInto = vi.fn().mockReturnValue(chain)
  chain.where = vi.fn().mockReturnValue(chain)
  chain.set = vi.fn().mockReturnValue(chain)
  chain.values = vi.fn().mockReturnValue(chain)
  chain.selectAll = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.execute = vi.fn().mockResolvedValue([])
  chain.executeTakeFirst = vi.fn().mockResolvedValue(null)
  chain.executeTakeFirstOrThrow = vi.fn().mockResolvedValue({
    id: "pay-1",
    type: "video_purchase",
    payer_id: "user-1",
    recipient_id: "creator-1",
    feed_id: "feed-1",
    video_id: "video-1",
    stripe_payment_intent_id: "pi_123",
    status: "completed",
  })
  return { db: chain }
})

import { refundPayment } from "./refund"
import { stripe } from "./stripe"

describe("refundPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls Stripe refund API", async () => {
    await refundPayment("pay-1", "Customer requested")
    expect(stripe.refunds.create).toHaveBeenCalledWith({
      payment_intent: "pi_123",
    })
  })
})
