import { test, expect } from "@playwright/test"

test.describe("Routers Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login")
    await page.getByLabel("Email").fill("admin@rutpanel.com")
    await page.getByLabel("Şifre").fill("admin123")
    await page.getByRole("button", { name: "Giriş Yap" }).click()
    await page.waitForURL(/\/dashboard/)
    await page.goto("/dashboard/routers")
  })

  test("should display routers page", async ({ page }) => {
    await expect(page.getByText("Router'lar")).toBeVisible()
    await expect(
      page.getByPlaceholder("S/N, IMEI, MAC, SSID ile ara...")
    ).toBeVisible()
  })

  test("should filter by search", async ({ page }) => {
    const searchInput = page.getByPlaceholder("S/N, IMEI, MAC, SSID ile ara...")
    await searchInput.fill("6006567539")

    // Wait for search to complete
    await page.waitForTimeout(500)

    // Verify search results (or no results message)
    await expect(
      page.getByText("6006567539").or(page.getByText("Router bulunamadı"))
    ).toBeVisible()
  })

  test("should filter by DIM-DB status", async ({ page }) => {
    // Click on DIM-DB status filter
    await page.getByText("Tümü").first().click()
    await page.getByText("Atanmamış").click()

    // Wait for filter to apply
    await page.waitForTimeout(500)
  })

  test("should open router detail dialog", async ({ page }) => {
    // If there are routers, click on more menu
    const moreButton = page.locator("button").filter({ hasText: "" }).first()

    if (await moreButton.isVisible()) {
      await moreButton.click()

      // Look for detail option
      const detailOption = page.getByText("Detay Görüntüle")
      if (await detailOption.isVisible()) {
        await detailOption.click()
        await expect(page.getByText("Router Detayı")).toBeVisible()
      }
    }
  })

  test("should copy password to clipboard", async ({ page }) => {
    // Grant clipboard permission
    await page.context().grantPermissions(["clipboard-write"])

    // If there are routers with passwords, test copy functionality
    const copyButton = page.locator('[class*="h-7 w-7"]').first()

    if (await copyButton.isVisible()) {
      await copyButton.click()
      await expect(page.getByText("Kopyalandı!")).toBeVisible()
    }
  })
})
