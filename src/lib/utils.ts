import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function maskPassword(password: string): string {
  return '•'.repeat(Math.min(password.length, 12))
}

export function formatMacAddress(mac: string): string {
  // Remove any existing separators and format with colons
  const cleaned = mac.replace(/[:-]/g, '').toUpperCase()
  return cleaned.match(/.{1,2}/g)?.join(':') || mac
}

export function validateImei(imei: string): boolean {
  // IMEI should be 15 digits
  const cleaned = imei.replace(/\D/g, '')
  return cleaned.length === 15
}

export function validateSerialNumber(sn: string): boolean {
  // Serial number should be 10 digits
  const cleaned = sn.replace(/\D/g, '')
  return cleaned.length === 10
}

export function validateMacAddress(mac: string): boolean {
  const cleaned = mac.replace(/[:-]/g, '')
  return /^[0-9A-Fa-f]{12}$/.test(cleaned)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

// RVM ID format: KPL 04 0 25 11 002
// Company (3) + MachineClass (2) + Separator (1) + Year (2) + Month (2) + Order (3)
export interface ParsedRvmId {
  company: string      // KPL
  machineClass: string // 04
  separator: string    // 0
  year: string         // 25
  month: string        // 11
  order: string        // 002
  isValid: boolean
}

export function parseRvmId(rvmId: string): ParsedRvmId {
  // Remove spaces and normalize
  const cleaned = rvmId.replace(/\s+/g, '').toUpperCase()

  // Expected format: KPL0402511002 (13 characters)
  // Or with variations in length
  const result: ParsedRvmId = {
    company: '',
    machineClass: '',
    separator: '',
    year: '',
    month: '',
    order: '',
    isValid: false
  }

  if (cleaned.length < 10) {
    return result
  }

  // Try to extract components
  // Pattern: [Company 3][Class 2][Sep 1][Year 2][Month 2][Order 3+]
  const match = cleaned.match(/^([A-Z]{2,4})(\d{2})(\d)(\d{2})(\d{2})(\d{2,4})$/)

  if (match) {
    result.company = match[1]
    result.machineClass = match[2]
    result.separator = match[3]
    result.year = match[4]
    result.month = match[5]
    result.order = match[6]
    result.isValid = true
  }

  return result
}

export function getUniqueRvmComponents(rvmIds: string[]): {
  machineClasses: string[]
  years: string[]
  months: string[]
} {
  const machineClasses = new Set<string>()
  const years = new Set<string>()
  const months = new Set<string>()

  for (const rvmId of rvmIds) {
    const parsed = parseRvmId(rvmId)
    if (parsed.isValid) {
      machineClasses.add(parsed.machineClass)
      years.add(parsed.year)
      months.add(parsed.month)
    }
  }

  return {
    machineClasses: Array.from(machineClasses).sort(),
    years: Array.from(years).sort(),
    months: Array.from(months).sort()
  }
}

export function formatMonth(month: string): string {
  const months: Record<string, string> = {
    '01': 'Ocak',
    '02': 'Şubat',
    '03': 'Mart',
    '04': 'Nisan',
    '05': 'Mayıs',
    '06': 'Haziran',
    '07': 'Temmuz',
    '08': 'Ağustos',
    '09': 'Eylül',
    '10': 'Ekim',
    '11': 'Kasım',
    '12': 'Aralık'
  }
  return months[month] || month
}
