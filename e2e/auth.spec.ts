import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login")

    await expect(page.getByRole("heading", { name: "Giriş Yap" })).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Şifre")).toBeVisible()
    await expect(page.getByRole("button", { name: "Giriş Yap" })).toBeVisible()
  })

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("wrong@email.com")
    await page.getByLabel("Şifre").fill("wrongpassword")
    await page.getByRole("button", { name: "Giriş Yap" }).click()

    await expect(page.getByText("Email veya şifre hatalı")).toBeVisible()
  })

  test("should redirect to dashboard after successful login", async ({
    page,
  }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("admin@rutpanel.com")
    await page.getByLabel("Şifre").fill("admin123")
    await page.getByRole("button", { name: "Giriş Yap" }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText("Dashboard")).toBeVisible()
  })

  test("should toggle password visibility", async ({ page }) => {
    await page.goto("/login")

    const passwordInput = page.getByLabel("Şifre")
    await passwordInput.fill("testpassword")

    // Check initial state is password (hidden)
    await expect(passwordInput).toHaveAttribute("type", "password")

    // Click toggle button
    await page.locator("button[type='button']").first().click()

    // Check password is now visible
    await expect(passwordInput).toHaveAttribute("type", "text")
  })
})
