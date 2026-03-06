import { test, expect } from "@playwright/test"

test.describe("Homepage", () => {
  test("page loads with correct title", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1")).toContainText("Anchor")
  })

  test("shows featured feeds or recent videos section", async ({ page }) => {
    await page.goto("/")
    const featured = page.locator("text=Featured Feeds")
    const recent = page.locator("text=Recent Videos")
    const noVideos = page.locator("text=No videos yet")
    await expect(featured.or(recent).or(noVideos).first()).toBeVisible()
  })
})
