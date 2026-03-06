import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SubscribeButton } from "./SubscribeButton"

describe("SubscribeButton", () => {
  it("renders with price", () => {
    render(<SubscribeButton feedId="feed-1" priceUsd={9.99} />)
    expect(screen.getByText("Subscribe $9.99/mo")).toBeInTheDocument()
  })

  it("renders custom label", () => {
    render(<SubscribeButton feedId="feed-1" priceUsd={9.99} label="Join Now" />)
    expect(screen.getByText("Join Now")).toBeInTheDocument()
  })
})
