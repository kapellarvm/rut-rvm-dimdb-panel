import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login")
    await page.getByLabel("Email").fill("admin@rutpanel.com")
    await page.getByLabel("Şifre").fill("admin123")
    await page.getByRole("button", { name: "Giriş Yap" }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test("should display dashboard with stats", async ({ page }) => {
    await expect(page.getByText("Dashboard")).toBeVisible()
    await expect(page.getByText("Toplam Router")).toBeVisible()
    await expect(page.getByText("RVM Birimleri")).toBeVisible()
    await expect(page.getByText("Atanmış DIM-DB")).toBeVisible()
    await expect(page.getByText("Atanmamış Router")).toBeVisible()
  })

  test("should navigate to routers page", async ({ page }) => {
    await page.getByRole("link", { name: "Router'lar" }).click()

    await expect(page).toHaveURL(/\/dashboard\/routers/)
    await expect(page.getByText("Sistemdeki tüm router'ları yönetin")).toBeVisible()
  })

  test("should navigate to RVM page", async ({ page }) => {
    await page.getByRole("link", { name: "RVM Birimleri" }).click()

    await expect(page).toHaveURL(/\/dashboard\/rvm/)
    await expect(
      page.getByText("RVM birimlerini ve bağlı router'ları görüntüleyin")
    ).toBeVisible()
  })

  test("should navigate to DIM-DB page", async ({ page }) => {
    await page.getByRole("link", { name: "DIM-DB" }).click()

    await expect(page).toHaveURL(/\/dashboard\/dimdb/)
    await expect(page.getByText("DIM-DB ID'lerini yönetin ve atayın")).toBeVisible()
  })

  test("should display sidebar on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    await expect(page.getByText("RUT Panel")).toBeVisible()
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible()
  })

  test("should show mobile menu on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    // Menu button should be visible on mobile
    const menuButton = page.locator("button").filter({ hasText: "" }).first()
    await expect(menuButton).toBeVisible()
  })
})
