import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { headerDetector } from "@/lib/excel-parser/header-detector"
import { dataValidator } from "@/lib/excel-parser/data-validator"
import type { ParsedRouterRow } from "@/types"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

    // Get range
    const range = XLSX.utils.decode_range(firstSheet["!ref"] || "A1")

    // Check if first row is a title row (only first cell has data or most cells empty)
    let headerRow = range.s.r
    let filledCellsInFirstRow = 0
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = firstSheet[XLSX.utils.encode_cell({ r: 0, c: col })]
      if (cell && String(cell.v).trim()) {
        filledCellsInFirstRow++
      }
    }

    // If first row has less than 3 filled cells, assume it's a title and use row 2 as headers
    if (filledCellsInFirstRow < 3 && range.e.r > 1) {
      headerRow = 1
    }

    // Parse rows starting after header row
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      defval: "",
      raw: false,
      range: headerRow, // Start from header row
    })

    // Get headers from parsed JSON keys (handles duplicate column names like Box No._1)
    const headers = rows.length > 0 ? Object.keys(rows[0]) : []

    // Detect column mappings
    const columnMatches = headerDetector.detectColumns(headers)

    // Get existing data
    const existingRouters = await prisma.router.findMany({
      select: { serialNumber: true, imei: true, id: true },
    })
    const serialMap = new Map(existingRouters.map((r) => [r.serialNumber, r.id]))
    const imeiMap = new Map(existingRouters.map((r) => [r.imei, r.id]))

    const existingRvmUnits = await prisma.rvmUnit.findMany({
      select: { rvmId: true, id: true },
    })
    const rvmMap = new Map(existingRvmUnits.map((r) => [r.rvmId, r.id]))

    const existingSimCards = await prisma.simCard.findMany({
      select: { phoneNumber: true, id: true },
    })
    const simCardMap = new Map(existingSimCards.map((s) => [s.phoneNumber, s.id]))

    let newCount = 0
    let updatedCount = 0
    let errorCount = 0
    const errors: { row: number; message: string }[] = []
    const createdRvmUnits: string[] = []
    const createdSimCards: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2

      try {
        // Map columns to fields
        const mapped: ParsedRouterRow = {}
        for (const match of columnMatches) {
          if (match.systemField && match.confidence >= 0.5) {
            const value = row[match.excelColumn]
            if (value !== undefined && value !== null && value !== "") {
              const cleanedValue = dataValidator.cleanValue(
                String(value),
                match.systemField
              )
              if (cleanedValue) {
                mapped[match.systemField] = cleanedValue
              }
            }
          }
        }

        // Validate
        const validation = dataValidator.validateRow(mapped, rowNumber)
        if (!validation.isValid) {
          errors.push({
            row: rowNumber,
            message: validation.errors.map((e) => e.message).join(", "),
          })
          errorCount++
          continue
        }

        const cleanedData = validation.cleanedData

        // Handle RVM unit
        let rvmUnitId: string | undefined
        if (cleanedData.rvmId) {
          if (rvmMap.has(cleanedData.rvmId)) {
            rvmUnitId = rvmMap.get(cleanedData.rvmId)
          } else {
            const newRvm = await prisma.rvmUnit.create({
              data: {
                rvmId: cleanedData.rvmId,
                name: `RVM ${cleanedData.rvmId}`,
              },
            })
            rvmMap.set(cleanedData.rvmId, newRvm.id)
            rvmUnitId = newRvm.id
            createdRvmUnits.push(cleanedData.rvmId)
          }
        }

        // Handle SIM Card
        let simCardId: string | undefined
        if (cleanedData.simCardPhone) {
          const normalizedPhone = cleanedData.simCardPhone.replace(/\s+/g, "")
          if (simCardMap.has(normalizedPhone)) {
            simCardId = simCardMap.get(normalizedPhone)
          } else {
            const newSimCard = await prisma.simCard.create({
              data: {
                phoneNumber: normalizedPhone,
                status: "ASSIGNED",
              },
            })
            simCardMap.set(normalizedPhone, newSimCard.id)
            simCardId = newSimCard.id
            createdSimCards.push(normalizedPhone)
          }
        }

        // Check if exists
        const existingId =
          (cleanedData.serialNumber && serialMap.get(cleanedData.serialNumber)) ||
          (cleanedData.imei && imeiMap.get(cleanedData.imei))

        if (existingId) {
          // Update existing
          await prisma.router.update({
            where: { id: existingId },
            data: {
              boxNoPrefix: cleanedData.boxNoPrefix,
              boxNo: cleanedData.boxNo,
              serialNumber: cleanedData.serialNumber,
              imei: cleanedData.imei,
              macAddress: cleanedData.macAddress,
              firmware: cleanedData.firmware,
              ssid: cleanedData.ssid,
              wifiPassword: cleanedData.wifiPassword,
              devicePassword: cleanedData.devicePassword,
              rvmUnitId,
              simCardId,
            },
          })
          updatedCount++
        } else {
          // Create new
          if (!cleanedData.serialNumber || !cleanedData.imei) {
            errors.push({
              row: rowNumber,
              message: "Serial number and IMEI required for new records",
            })
            errorCount++
            continue
          }

          const newRouter = await prisma.router.create({
            data: {
              boxNoPrefix: cleanedData.boxNoPrefix,
              boxNo: cleanedData.boxNo || "",
              serialNumber: cleanedData.serialNumber,
              imei: cleanedData.imei,
              macAddress: cleanedData.macAddress || "",
              firmware: cleanedData.firmware,
              ssid: cleanedData.ssid,
              wifiPassword: cleanedData.wifiPassword,
              devicePassword: cleanedData.devicePassword,
              rvmUnitId,
              simCardId,
            },
          })

          serialMap.set(cleanedData.serialNumber, newRouter.id)
          imeiMap.set(cleanedData.imei, newRouter.id)
          newCount++
        }
      } catch (err) {
        errors.push({
          row: rowNumber,
          message: err instanceof Error ? err.message : "Unknown error",
        })
        errorCount++
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "IMPORT",
        entityType: "ROUTER",
        userId: session.user.id,
        details: {
          fileName: file.name,
          totalRows: rows.length,
          newCount,
          updatedCount,
          errorCount,
          createdRvmUnits,
          createdSimCards,
        },
      },
    })

    return NextResponse.json({
      success: errorCount === 0,
      totalRows: rows.length,
      newCount,
      updatedCount,
      errorCount,
      errors: errors.slice(0, 20), // Limit errors in response
      createdRvmUnits,
      createdSimCards,
      columnMappings: columnMatches,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
