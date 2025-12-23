import { prisma } from '@/lib/prisma'
import type { ParsedRouterRow, ImportError } from '@/types'

export interface MergeResult {
  success: boolean
  newCount: number
  updatedCount: number
  errorCount: number
  errors: ImportError[]
  createdRvmUnits: string[]
}

class MergeStrategy {
  async merge(
    rows: ParsedRouterRow[],
    onProgress?: (progress: number, message: string) => void
  ): Promise<MergeResult> {
    const result: MergeResult = {
      success: true,
      newCount: 0,
      updatedCount: 0,
      errorCount: 0,
      errors: [],
      createdRvmUnits: [],
    }

    // Get existing routers by serial number and IMEI
    const existingRouters = await prisma.router.findMany({
      select: {
        id: true,
        serialNumber: true,
        imei: true,
      },
    })

    const serialMap = new Map(existingRouters.map(r => [r.serialNumber, r]))
    const imeiMap = new Map(existingRouters.map(r => [r.imei, r]))

    // Get existing RVM units
    const existingRvmUnits = await prisma.rvmUnit.findMany({
      select: { id: true, rvmId: true },
    })
    const rvmMap = new Map(existingRvmUnits.map(r => [r.rvmId, r.id]))

    // Process rows in batches
    const batchSize = 50
    const totalBatches = Math.ceil(rows.length / batchSize)

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize
      const end = Math.min(start + batchSize, rows.length)
      const batch = rows.slice(start, end)

      if (onProgress) {
        const progress = 50 + ((batchIndex + 1) / totalBatches) * 45
        onProgress(progress, `Processing batch ${batchIndex + 1}/${totalBatches}...`)
      }

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i]
        const rowNumber = start + i + 2

        try {
          // Handle RVM unit creation if needed
          let rvmUnitId: string | undefined
          if (row.rvmId) {
            if (rvmMap.has(row.rvmId)) {
              rvmUnitId = rvmMap.get(row.rvmId)
            } else {
              // Create new RVM unit
              const newRvm = await prisma.rvmUnit.create({
                data: {
                  rvmId: row.rvmId,
                  name: `RVM ${row.rvmId}`,
                },
              })
              rvmMap.set(row.rvmId, newRvm.id)
              rvmUnitId = newRvm.id
              result.createdRvmUnits.push(row.rvmId)
            }
          }

          // Check if router exists
          const existingBySerial = row.serialNumber ? serialMap.get(row.serialNumber) : null
          const existingByImei = row.imei ? imeiMap.get(row.imei) : null
          const existing = existingBySerial || existingByImei

          if (existing) {
            // Update existing router (preserve dimDbId if already set)
            await prisma.router.update({
              where: { id: existing.id },
              data: {
                boxNoPrefix: row.boxNoPrefix || undefined,
                boxNo: row.boxNo || undefined,
                serialNumber: row.serialNumber || undefined,
                imei: row.imei || undefined,
                macAddress: row.macAddress || undefined,
                firmware: row.firmware || undefined,
                ssid: row.ssid || undefined,
                wifiPassword: row.wifiPassword || undefined,
                devicePassword: row.devicePassword || undefined,
                rvmUnitId: rvmUnitId || undefined,
                // Note: We don't update dimDbId here to preserve existing assignments
              },
            })
            result.updatedCount++
          } else {
            // Create new router
            if (!row.serialNumber || !row.imei) {
              result.errors.push({
                row: rowNumber,
                field: 'serialNumber/imei',
                message: 'Both Serial Number and IMEI are required for new records',
              })
              result.errorCount++
              continue
            }

            const newRouter = await prisma.router.create({
              data: {
                boxNoPrefix: row.boxNoPrefix,
                boxNo: row.boxNo || '',
                serialNumber: row.serialNumber,
                imei: row.imei,
                macAddress: row.macAddress || '',
                firmware: row.firmware,
                ssid: row.ssid,
                wifiPassword: row.wifiPassword,
                devicePassword: row.devicePassword,
                rvmUnitId: rvmUnitId,
              },
            })

            // Update maps for duplicate detection within import
            serialMap.set(row.serialNumber, { id: newRouter.id, serialNumber: row.serialNumber, imei: row.imei })
            imeiMap.set(row.imei, { id: newRouter.id, serialNumber: row.serialNumber, imei: row.imei })
            result.newCount++
          }
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            field: 'general',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
          result.errorCount++
        }
      }
    }

    result.success = result.errorCount === 0

    return result
  }

  async getExistingIdentifiers(): Promise<{ serialNumbers: Set<string>; imeis: Set<string> }> {
    const routers = await prisma.router.findMany({
      select: {
        serialNumber: true,
        imei: true,
      },
    })

    return {
      serialNumbers: new Set(routers.map(r => r.serialNumber)),
      imeis: new Set(routers.map(r => r.imei)),
    }
  }
}

export const mergeStrategy = new MergeStrategy()
