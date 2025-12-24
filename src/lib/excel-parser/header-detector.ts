import type { ParsedRouterRow } from '@/types'

export interface ColumnMatch {
  excelColumn: string
  systemField: keyof ParsedRouterRow | null
  confidence: number
}

interface FieldPattern {
  field: keyof ParsedRouterRow
  patterns: string[]
  weight: number
}

const FIELD_PATTERNS: FieldPattern[] = [
  {
    field: 'boxNoPrefix',
    patterns: [
      'box no prefix', 'prefix', 'box prefix', 'model', 'model no',
      'ürün kodu', 'product code', 'part no', 'part number', 'rut901',
      'box no', 'box no.'
    ],
    weight: 0.8,
  },
  {
    field: 'boxNo',
    patterns: [
      'box no_1', 'box no._1', 'box_1', 'kutu', 'kutu no', 'boxno', 'box number',
      'box id', 'paket no', 'koli no', 'koli', 'ambalaj no'
    ],
    weight: 0.9,
  },
  {
    field: 'serialNumber',
    patterns: [
      's/n', 'sn', 'serial', 'seri', 'seri no', 'serial number', 'serialnumber', 'seri numarası',
      'serial no', 'ser no', 'ser.no', 'ser. no', 'serno', 's.n', 's.no', 's. no',
      'ürün seri', 'cihaz seri', 'router seri', 'modem seri'
    ],
    weight: 1.0,
  },
  {
    field: 'imei',
    patterns: [
      'imei', 'imei no', 'imei number', 'imei numarası', 'imei1', 'imei 1',
      'device imei', 'cihaz imei', 'modem imei', 'router imei'
    ],
    weight: 1.0,
  },
  {
    field: 'macAddress',
    patterns: [
      'mac', 'mac address', 'macaddress', 'mac adresi', 'mac addr',
      'wifi mac', 'wlan mac', 'ethernet mac', 'lan mac', 'mac id'
    ],
    weight: 1.0,
  },
  {
    field: 'firmware',
    patterns: [
      'fw', 'firmware', 'fw version', 'firmware version', 'version', 'versiyon',
      'yazılım', 'yazılım versiyonu', 'sw version', 'software version',
      'fw ver', 'firmware ver', 'yazılım sürümü'
    ],
    weight: 0.9,
  },
  {
    field: 'ssid',
    patterns: [
      'ssid', 'wifi ssid', 'wifi name', 'network name', 'ağ adı',
      'wifi adı', 'kablosuz ağ', 'wireless name', 'wlan name', 'ap name'
    ],
    weight: 1.0,
  },
  {
    field: 'wifiPassword',
    patterns: [
      'wifi password', 'wifipassword', 'wifi pass', 'wifipass', 'wifi şifre', 'wifi pw',
      'wifi şifresi', 'wireless password', 'wlan password', 'wlan şifre', 'kablosuz şifre',
      'wifi key', 'wireless key', 'wpa key', 'wpa password', 'network password'
    ],
    weight: 1.0,
  },
  {
    field: 'devicePassword',
    patterns: [
      'device password', 'devicepassword', 'panel password', 'panel pass', 'panel şifre',
      'cihaz şifre', 'admin password', 'şifre', 'password', 'admin şifre', 'yönetici şifre',
      'router password', 'modem şifre', 'web password', 'login password', 'giriş şifre'
    ],
    weight: 0.9,
  },
  {
    field: 'rvmId',
    patterns: [
      'rvm', 'rvm id', 'rvmid', 'rvm no', 'rvm kodu', 'rvm code',
      'makine id', 'machine id', 'otomat id', 'otomat no'
    ],
    weight: 1.0,
  },
  {
    field: 'dimDbId',
    patterns: [
      'dim-db', 'dimdb', 'dim db', 'dim-db id', 'dimdb id',
      'dim', 'db id', 'database id', 'veritabanı id'
    ],
    weight: 1.0,
  },
]

class HeaderDetector {
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length
    const n = str2.length
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
        }
      }
    }

    return dp[m][n]
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .trim()
      .replace(/[_\-\.]/g, ' ')
      .replace(/\s+/g, ' ')
  }

  private calculateSimilarity(header: string, pattern: string): number {
    const normalizedHeader = this.normalizeHeader(header)
    const normalizedPattern = this.normalizeHeader(pattern)

    // Exact match
    if (normalizedHeader === normalizedPattern) return 1.0

    // Contains match
    if (normalizedHeader.includes(normalizedPattern) || normalizedPattern.includes(normalizedHeader)) {
      return 0.85
    }

    // Levenshtein distance based similarity
    const maxLen = Math.max(normalizedHeader.length, normalizedPattern.length)
    if (maxLen === 0) return 0

    const distance = this.levenshteinDistance(normalizedHeader, normalizedPattern)
    const similarity = 1 - (distance / maxLen)

    return similarity
  }

  detectColumns(headers: string[]): ColumnMatch[] {
    const matches: ColumnMatch[] = []
    const usedFields = new Set<keyof ParsedRouterRow>()

    // First pass: find exact and high confidence matches
    for (const header of headers) {
      let bestMatch: { field: keyof ParsedRouterRow | null; confidence: number } = {
        field: null,
        confidence: 0,
      }

      for (const fieldPattern of FIELD_PATTERNS) {
        if (usedFields.has(fieldPattern.field)) continue

        for (const pattern of fieldPattern.patterns) {
          const similarity = this.calculateSimilarity(header, pattern) * fieldPattern.weight
          if (similarity > bestMatch.confidence && similarity >= 0.5) {
            bestMatch = { field: fieldPattern.field, confidence: similarity }
          }
        }
      }

      if (bestMatch.field && bestMatch.confidence >= 0.7) {
        usedFields.add(bestMatch.field)
      }

      matches.push({
        excelColumn: header,
        systemField: bestMatch.confidence >= 0.5 ? bestMatch.field : null,
        confidence: bestMatch.confidence,
      })
    }

    return matches
  }

  suggestMapping(header: string): { field: keyof ParsedRouterRow; confidence: number }[] {
    const suggestions: { field: keyof ParsedRouterRow; confidence: number }[] = []

    for (const fieldPattern of FIELD_PATTERNS) {
      let maxConfidence = 0
      for (const pattern of fieldPattern.patterns) {
        const similarity = this.calculateSimilarity(header, pattern) * fieldPattern.weight
        maxConfidence = Math.max(maxConfidence, similarity)
      }
      if (maxConfidence > 0.3) {
        suggestions.push({ field: fieldPattern.field, confidence: maxConfidence })
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }
}

export const headerDetector = new HeaderDetector()
