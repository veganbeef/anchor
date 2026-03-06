import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { RefundDialog } from "./RefundDialog"

describe("RefundDialog", () => {
  it("shows refund button initially", () => {
    render(<RefundDialog paymentId="pay-1" amount={9.99} onRefunded={() => {}} />)
    expect(screen.getByText("Refund")).toBeInTheDocument()
  })

  it("opens dialog on click", () => {
    render(<RefundDialog paymentId="pay-1" amount={9.99} onRefunded={() => {}} />)
    fireEvent.click(screen.getByText("Refund"))
    expect(screen.getByText("Refund $9.99")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Reason for refund (required)")).toBeInTheDocument()
  })

  it("disables confirm when reason is empty", () => {
    render(<RefundDialog paymentId="pay-1" amount={9.99} onRefunded={() => {}} />)
    fireEvent.click(screen.getByText("Refund"))
    const confirmBtn = screen.getByText("Confirm Refund")
    expect(confirmBtn).toBeDisabled()
  })
})
