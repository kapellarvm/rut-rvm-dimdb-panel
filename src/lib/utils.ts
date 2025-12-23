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
