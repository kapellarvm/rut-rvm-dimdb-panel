import * as XLSX from 'xlsx'
import { headerDetector, ColumnMatch } from './header-detector'
import { dataValidator, ValidationResult } from './data-validator'
import { mergeStrategy, MergeResult } from './merge-strategy'
import type { ParsedRouterRow, ImportPreview, ImportError, ImportWarning } from '@/types'

export interface ParsedExcel {
  headers: string[]
  rows: Record<string, unknown>[]
  columnMatches: ColumnMatch[]
}

export function parseExcelFile(file: ArrayBuffer): ParsedExcel {
  const workbook = XLSX.read(file, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

  // Get headers from first row
  const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1')
  const headers: string[] = []

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = firstSheet[cellAddress]
    headers.push(cell ? String(cell.v).trim() : `Column${col + 1}`)
  }

  // Parse all rows
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: '',
    raw: false,
  })

  // Detect column mappings
  const columnMatches = headerDetector.detectColumns(headers)

  return {
    headers,
    rows,
    columnMatches,
  }
}

export function generatePreview(
  parsedExcel: ParsedExcel,
  existingSerialNumbers: Set<string>,
  existingImeis: Set<string>
): ImportPreview {
  const errors: ImportError[] = []
  const sampleData: ParsedRouterRow[] = []
  let newRecords = 0
  let existingRecords = 0
  let duplicates = 0
  const seenSerials = new Set<string>()
  const seenImeis = new Set<string>()

  for (let i = 0; i < parsedExcel.rows.length; i++) {
    const row = parsedExcel.rows[i]
    const rowNumber = i + 2 // Excel row number (1-indexed + header)

    // Map columns to fields
    const mapped = mapRowToFields(row, parsedExcel.columnMatches)

    // Validate row
    const validation = dataValidator.validateRow(mapped, rowNumber)
    errors.push(...validation.errors)

    if (!validation.isValid) continue

    // Check for duplicates within file
    if (mapped.serialNumber) {
      if (seenSerials.has(mapped.serialNumber)) {
        duplicates++
        continue
      }
      seenSerials.add(mapped.serialNumber)
    }

    if (mapped.imei) {
      if (seenImeis.has(mapped.imei)) {
        duplicates++
        continue
      }
      seenImeis.add(mapped.imei)
    }

    // Check if record exists in database
    const serialExists = mapped.serialNumber && existingSerialNumbers.has(mapped.serialNumber)
    const imeiExists = mapped.imei && existingImeis.has(mapped.imei)

    if (serialExists || imeiExists) {
      existingRecords++
    } else {
      newRecords++
    }

    // Add to sample (first 10)
    if (sampleData.length < 10) {
      sampleData.push(mapped)
    }
  }

  return {
    totalRows: parsedExcel.rows.length,
    newRecords,
    existingRecords,
    duplicates,
    errors,
    columnMappings: parsedExcel.columnMatches,
    sampleData,
  }
}

export function mapRowToFields(
  row: Record<string, unknown>,
  columnMatches: ColumnMatch[]
): ParsedRouterRow {
  const mapped: ParsedRouterRow = {}

  for (const match of columnMatches) {
    if (match.systemField && match.confidence >= 0.5) {
      const value = row[match.excelColumn]
      if (value !== undefined && value !== null && value !== '') {
        const cleanedValue = dataValidator.cleanValue(String(value), match.systemField)
        if (cleanedValue) {
          mapped[match.systemField] = cleanedValue
        }
      }
    }
  }

  return mapped
}

export async function processImport(
  parsedExcel: ParsedExcel,
  onProgress?: (progress: number, message: string) => void
): Promise<MergeResult> {
  const parsedRows: ParsedRouterRow[] = []

  for (let i = 0; i < parsedExcel.rows.length; i++) {
    const row = parsedExcel.rows[i]
    const mapped = mapRowToFields(row, parsedExcel.columnMatches)
    const validation = dataValidator.validateRow(mapped, i + 2)

    if (validation.isValid) {
      parsedRows.push(mapped)
    }

    if (onProgress && i % 100 === 0) {
      onProgress((i / parsedExcel.rows.length) * 50, `Parsing row ${i + 1}...`)
    }
  }

  if (onProgress) {
    onProgress(50, 'Merging with database...')
  }

  const result = await mergeStrategy.merge(parsedRows, onProgress)

  if (onProgress) {
    onProgress(100, 'Import complete!')
  }

  return result
}

export { headerDetector, dataValidator, mergeStrategy }
