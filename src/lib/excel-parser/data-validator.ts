import type { ParsedRouterRow, ImportError, ImportWarning } from '@/types'

export interface ValidationResult {
  isValid: boolean
  errors: ImportError[]
  warnings: ImportWarning[]
  cleanedData: ParsedRouterRow
}

class DataValidator {
  validateRow(row: ParsedRouterRow, rowNumber: number): ValidationResult {
    const errors: ImportError[] = []
    const warnings: ImportWarning[] = []
    const cleanedData: ParsedRouterRow = { ...row }

    // Required field check - at least serial number or IMEI is required
    if (!row.serialNumber && !row.imei) {
      errors.push({
        row: rowNumber,
        field: 'serialNumber/imei',
        message: 'At least Serial Number or IMEI is required',
      })
    }

    // Serial Number validation
    if (row.serialNumber) {
      const cleaned = this.cleanSerialNumber(row.serialNumber)
      if (!this.isValidSerialNumber(cleaned)) {
        warnings.push({
          row: rowNumber,
          field: 'serialNumber',
          message: 'Serial number format might be incorrect',
          value: row.serialNumber,
        })
      }
      cleanedData.serialNumber = cleaned
    }

    // IMEI validation
    if (row.imei) {
      const cleaned = this.cleanImei(row.imei)
      if (!this.isValidImei(cleaned)) {
        errors.push({
          row: rowNumber,
          field: 'imei',
          message: 'Invalid IMEI format (should be 15 digits)',
          value: row.imei,
        })
      } else {
        cleanedData.imei = cleaned
      }
    }

    // MAC Address validation
    if (row.macAddress) {
      const cleaned = this.cleanMacAddress(row.macAddress)
      if (!this.isValidMacAddress(cleaned)) {
        warnings.push({
          row: rowNumber,
          field: 'macAddress',
          message: 'MAC address format might be incorrect',
          value: row.macAddress,
        })
      }
      cleanedData.macAddress = cleaned
    }

    // Box No validation
    if (row.boxNo) {
      cleanedData.boxNo = this.cleanBoxNo(row.boxNo)
    }

    // Firmware validation
    if (row.firmware) {
      cleanedData.firmware = row.firmware.trim()
    }

    // SSID validation
    if (row.ssid) {
      cleanedData.ssid = row.ssid.trim()
    }

    // Password fields - just trim
    if (row.wifiPassword) {
      cleanedData.wifiPassword = row.wifiPassword.trim()
    }
    if (row.devicePassword) {
      cleanedData.devicePassword = row.devicePassword.trim()
    }

    // RVM ID validation
    if (row.rvmId) {
      cleanedData.rvmId = row.rvmId.trim().toUpperCase()
    }

    // DIM-DB ID validation
    if (row.dimDbId) {
      cleanedData.dimDbId = row.dimDbId.trim()
    }

    const isValid = errors.length === 0 && !!(cleanedData.serialNumber || cleanedData.imei)

    return { isValid, errors, warnings, cleanedData }
  }

  cleanValue(value: string, field: keyof ParsedRouterRow): string {
    switch (field) {
      case 'serialNumber':
        return this.cleanSerialNumber(value)
      case 'imei':
        return this.cleanImei(value)
      case 'macAddress':
        return this.cleanMacAddress(value)
      case 'boxNo':
        return this.cleanBoxNo(value)
      case 'rvmId':
        return value.trim().toUpperCase()
      default:
        return value.trim()
    }
  }

  private cleanSerialNumber(value: string): string {
    // Remove spaces and non-numeric characters, keep digits only
    return value.replace(/\D/g, '')
  }

  private cleanImei(value: string): string {
    // Remove all non-digit characters
    return value.replace(/\D/g, '')
  }

  private cleanMacAddress(value: string): string {
    // Remove separators and uppercase
    return value.replace(/[:\-\s]/g, '').toUpperCase()
  }

  private cleanBoxNo(value: string): string {
    // Trim and standardize
    return value.trim()
  }

  private isValidSerialNumber(value: string): boolean {
    // Serial number should be 10 digits
    return /^\d{10}$/.test(value)
  }

  private isValidImei(value: string): boolean {
    // IMEI should be exactly 15 digits
    return /^\d{15}$/.test(value)
  }

  private isValidMacAddress(value: string): boolean {
    // MAC address should be 12 hex characters
    return /^[0-9A-F]{12}$/i.test(value)
  }

  // Luhn algorithm for IMEI checksum validation
  validateImeiChecksum(imei: string): boolean {
    if (imei.length !== 15) return false

    let sum = 0
    for (let i = 0; i < 15; i++) {
      let digit = parseInt(imei[i], 10)
      if (i % 2 === 1) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
    }

    return sum % 10 === 0
  }
}

export const dataValidator = new DataValidator()
