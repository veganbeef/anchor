import { describe, it, expect } from "vitest"
import { stripHtml } from "./html"

describe("stripHtml", () => {
  it("strips HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world")
  })

  it("strips style tags and content", () => {
    expect(stripHtml("<style>.foo{color:red}</style><p>Content</p>")).toBe("Content")
  })

  it("strips script tags and content", () => {
    expect(stripHtml("<script>alert('xss')</script><p>Safe</p>")).toBe("Safe")
  })

  it("collapses whitespace", () => {
    expect(stripHtml("<p>Hello</p>   <p>World</p>")).toBe("Hello World")
  })

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("")
  })
})
