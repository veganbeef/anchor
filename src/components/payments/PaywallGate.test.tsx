import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { PaywallGate } from "./PaywallGate"

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe("PaywallGate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows children when user has access", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ hasAccess: true }),
    })

    render(
      <PaywallGate feedId="feed-1">
        <div>Secret content</div>
      </PaywallGate>,
    )

    await waitFor(() => {
      expect(screen.getByText("Secret content")).toBeInTheDocument()
    })
  })

  it("shows paywall when user lacks access", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ hasAccess: false }),
    })

    render(
      <PaywallGate feedId="feed-1" subscriptionPriceUsd={9.99}>
        <div>Secret content</div>
      </PaywallGate>,
    )

    await waitFor(() => {
      expect(screen.getByText("This content is premium")).toBeInTheDocument()
    })
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument()
  })
})
