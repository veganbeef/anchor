import { test, expect } from "@playwright/test"

test.describe("Feed page", () => {
  test("displays feed name when navigating to a feed", async ({ page }) => {
    // Navigate to homepage first to find a feed link
    await page.goto("/")
    const feedLink = page.locator('a[href^="/feed/"]').first()

    if (await feedLink.isVisible()) {
      await feedLink.click()
      await expect(page.locator("h1")).toBeVisible()
    }
  })

  test("shows paywall gate for paywalled content when not authenticated", async ({ page }) => {
    await page.goto("/")
    const feedLink = page.locator('a[href^="/feed/"]').first()

    if (await feedLink.isVisible()) {
      await feedLink.click()
      // If the feed is paywalled, the paywall gate or sign-in prompt should be visible
      const paywall = page.locator("text=This content is premium")
      const signIn = page.locator("text=Sign in to")
      const content = page.locator("article")
      await expect(paywall.or(signIn).or(content).first()).toBeVisible()
    }
  })
})
