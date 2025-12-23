import { describe, it, expect } from "vitest"
import { dataValidator } from "../data-validator"

describe("DataValidator", () => {
  describe("validateRow", () => {
    it("should validate a complete row successfully", () => {
      const row = {
        serialNumber: "6006566691",
        imei: "868291076903737",
        macAddress: "20972780A7E8",
        boxNo: "029-2423",
      }

      const result = dataValidator.validateRow(row, 1)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("should fail validation if neither serial nor IMEI is provided", () => {
      const row = {
        boxNo: "029-2423",
        macAddress: "20972780A7E8",
      }

      const result = dataValidator.validateRow(row, 1)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe("serialNumber/imei")
    })

    it("should fail validation for invalid IMEI length", () => {
      const row = {
        serialNumber: "6006566691",
        imei: "12345", // Too short
      }

      const result = dataValidator.validateRow(row, 1)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.field === "imei")).toBe(true)
    })

    it("should add warnings for potentially invalid serial numbers", () => {
      const row = {
        serialNumber: "123", // Too short
        imei: "868291076903737",
      }

      const result = dataValidator.validateRow(row, 1)

      expect(result.warnings.some((w) => w.field === "serialNumber")).toBe(true)
    })

    it("should clean and format values correctly", () => {
      const row = {
        serialNumber: "  6006566691  ",
        imei: "868-291-076-903-737",
        macAddress: "20:97:27:80:A7:E8",
        rvmId: "kpl0402511010",
      }

      const result = dataValidator.validateRow(row, 1)

      expect(result.cleanedData.serialNumber).toBe("6006566691")
      expect(result.cleanedData.imei).toBe("868291076903737")
      expect(result.cleanedData.macAddress).toBe("20972780A7E8")
      expect(result.cleanedData.rvmId).toBe("KPL0402511010")
    })
  })

  describe("cleanValue", () => {
    it("should clean serial numbers", () => {
      expect(dataValidator.cleanValue("600-656-6691", "serialNumber")).toBe(
        "6006566691"
      )
    })

    it("should clean IMEI values", () => {
      expect(dataValidator.cleanValue("868-291-076-903-737", "imei")).toBe(
        "868291076903737"
      )
    })

    it("should clean and uppercase MAC addresses", () => {
      expect(dataValidator.cleanValue("20:97:27:80:a7:e8", "macAddress")).toBe(
        "20972780A7E8"
      )
    })

    it("should uppercase RVM IDs", () => {
      expect(dataValidator.cleanValue("kpl0402511010", "rvmId")).toBe(
        "KPL0402511010"
      )
    })
  })

  describe("validateImeiChecksum", () => {
    it("should validate correct IMEI checksums", () => {
      // This is a test IMEI, real validation would require proper Luhn check
      expect(dataValidator.validateImeiChecksum("490154203237518")).toBe(true)
    })

    it("should reject IMEI with wrong length", () => {
      expect(dataValidator.validateImeiChecksum("12345")).toBe(false)
    })
  })
})
