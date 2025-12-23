import { describe, it, expect } from "vitest"
import { headerDetector } from "../header-detector"

describe("HeaderDetector", () => {
  describe("detectColumns", () => {
    it("should detect exact matches with high confidence", () => {
      const headers = ["S/N", "IMEI", "MAC", "SSID"]
      const result = headerDetector.detectColumns(headers)

      expect(result).toHaveLength(4)
      expect(result[0].systemField).toBe("serialNumber")
      expect(result[0].confidence).toBeGreaterThan(0.8)
      expect(result[1].systemField).toBe("imei")
      expect(result[2].systemField).toBe("macAddress")
      expect(result[3].systemField).toBe("ssid")
    })

    it("should detect similar names with good confidence", () => {
      const headers = ["Seri Numarası", "IMEI No", "MAC Address"]
      const result = headerDetector.detectColumns(headers)

      expect(result[0].systemField).toBe("serialNumber")
      expect(result[0].confidence).toBeGreaterThan(0.5)
      expect(result[1].systemField).toBe("imei")
      expect(result[2].systemField).toBe("macAddress")
    })

    it("should detect password fields", () => {
      const headers = ["WiFi PASSWORD", "DevicePassword"]
      const result = headerDetector.detectColumns(headers)

      expect(result[0].systemField).toBe("wifiPassword")
      expect(result[1].systemField).toBe("devicePassword")
    })

    it("should detect RVM and DIM-DB fields", () => {
      const headers = ["RVM ID", "DIM-DB ID"]
      const result = headerDetector.detectColumns(headers)

      expect(result[0].systemField).toBe("rvmId")
      expect(result[1].systemField).toBe("dimDbId")
    })

    it("should return null for unrecognized columns", () => {
      const headers = ["Unknown Column", "Random Data"]
      const result = headerDetector.detectColumns(headers)

      expect(result[0].systemField).toBeNull()
      expect(result[1].systemField).toBeNull()
    })

    it("should handle case insensitivity", () => {
      const headers = ["imei", "SERIAL", "Mac ADDRESS"]
      const result = headerDetector.detectColumns(headers)

      expect(result[0].systemField).toBe("imei")
      expect(result[1].systemField).toBe("serialNumber")
      expect(result[2].systemField).toBe("macAddress")
    })
  })

  describe("suggestMapping", () => {
    it("should suggest possible mappings for ambiguous headers", () => {
      const suggestions = headerDetector.suggestMapping("Serial")

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0].field).toBe("serialNumber")
    })

    it("should return empty array for completely unrecognized headers", () => {
      const suggestions = headerDetector.suggestMapping("xyz123abc")

      expect(suggestions.length).toBe(0)
    })
  })
})
