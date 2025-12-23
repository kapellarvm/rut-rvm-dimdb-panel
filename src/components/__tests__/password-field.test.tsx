import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { PasswordField } from "../shared/password-field"

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}))

describe("PasswordField", () => {
  it("should render masked password by default", () => {
    render(<PasswordField value="testpassword" />)

    expect(screen.getByText("••••••••••••")).toBeInTheDocument()
  })

  it("should toggle password visibility", async () => {
    render(<PasswordField value="testpassword" />)

    // Initially masked
    expect(screen.getByText("••••••••••••")).toBeInTheDocument()

    // Find and click the show button (first button)
    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[0])

    // Now visible
    await waitFor(() => {
      expect(screen.getByText("testpassword")).toBeInTheDocument()
    })

    // Click again to hide
    fireEvent.click(buttons[0])

    await waitFor(() => {
      expect(screen.getByText("••••••••••••")).toBeInTheDocument()
    })
  })

  it("should copy password to clipboard", async () => {
    render(<PasswordField value="testpassword" label="Test Password" />)

    // Find the copy button (second button)
    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[1])

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("testpassword")
    })
  })

  it("should render with custom label", () => {
    render(<PasswordField value="test" label="WiFi Password" />)

    // Label is used in toast, so we just verify render doesn't crash
    expect(screen.getByText("••••")).toBeInTheDocument()
  })
})
