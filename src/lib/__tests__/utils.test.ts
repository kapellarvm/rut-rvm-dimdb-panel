import { describe, it, expect } from "vitest"
import {
  cn,
  formatDate,
  formatDateShort,
  maskPassword,
  formatMacAddress,
  validateImei,
  validateSerialNumber,
  validateMacAddress,
  debounce,
} from "../utils"

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names correctly", () => {
      expect(cn("foo", "bar")).toBe("foo bar")
    })

    it("should handle conditional classes", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz")
    })

    it("should merge tailwind classes correctly", () => {
      expect(cn("p-4", "p-8")).toBe("p-8")
    })
  })

  describe("formatDate", () => {
    it("should format date correctly", () => {
      const date = new Date("2024-01-15T10:30:00")
      const formatted = formatDate(date)

      expect(formatted).toContain("2024")
      expect(formatted).toContain("Oca")
    })

    it("should handle string dates", () => {
      const formatted = formatDate("2024-01-15T10:30:00")

      expect(formatted).toBeTruthy()
    })
  })

  describe("formatDateShort", () => {
    it("should format date without time", () => {
      const date = new Date("2024-01-15T10:30:00")
      const formatted = formatDateShort(date)

      expect(formatted).toContain("2024")
      expect(formatted).not.toContain("10:30")
    })
  })

  describe("maskPassword", () => {
    it("should mask password with dots", () => {
      expect(maskPassword("password123")).toBe("••••••••••••")
    })

    it("should handle empty string", () => {
      expect(maskPassword("")).toBe("")
    })

    it("should limit mask to 12 characters", () => {
      expect(maskPassword("verylongpassword")).toBe("••••••••••••")
    })
  })

  describe("formatMacAddress", () => {
    it("should format MAC address with colons", () => {
      expect(formatMacAddress("20972780A7E8")).toBe("20:97:27:80:A7:E8")
    })

    it("should handle already formatted MAC", () => {
      expect(formatMacAddress("20:97:27:80:A7:E8")).toBe("20:97:27:80:A7:E8")
    })

    it("should handle MAC with dashes", () => {
      expect(formatMacAddress("20-97-27-80-A7-E8")).toBe("20:97:27:80:A7:E8")
    })
  })

  describe("validateImei", () => {
    it("should validate correct IMEI", () => {
      expect(validateImei("868291076903737")).toBe(true)
    })

    it("should reject short IMEI", () => {
      expect(validateImei("12345")).toBe(false)
    })

    it("should handle IMEI with separators", () => {
      expect(validateImei("868-291-076-903-737")).toBe(true)
    })
  })

  describe("validateSerialNumber", () => {
    it("should validate correct serial number", () => {
      expect(validateSerialNumber("6006566691")).toBe(true)
    })

    it("should reject short serial number", () => {
      expect(validateSerialNumber("12345")).toBe(false)
    })
  })

  describe("validateMacAddress", () => {
    it("should validate correct MAC address", () => {
      expect(validateMacAddress("20972780A7E8")).toBe(true)
    })

    it("should validate MAC with separators", () => {
      expect(validateMacAddress("20:97:27:80:A7:E8")).toBe(true)
    })

    it("should reject invalid MAC", () => {
      expect(validateMacAddress("invalid")).toBe(false)
    })
  })

  describe("debounce", () => {
    it("should debounce function calls", async () => {
      let callCount = 0
      const fn = () => callCount++
      const debouncedFn = debounce(fn, 100)

      debouncedFn()
      debouncedFn()
      debouncedFn()

      expect(callCount).toBe(0)

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(callCount).toBe(1)
    })
  })
})
