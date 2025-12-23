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
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
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

    // Get headers
    const range = XLSX.utils.decode_range(firstSheet["!ref"] || "A1")
    const headers: string[] = []
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
      const cell = firstSheet[cellAddress]
      headers.push(cell ? String(cell.v).trim() : `Column${col + 1}`)
    }

    // Detect column mappings
    const columnMatches = headerDetector.detectColumns(headers)

    // Parse rows
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      defval: "",
      raw: false,
    })

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

    let newCount = 0
    let updatedCount = 0
    let errorCount = 0
    const errors: { row: number; message: string }[] = []
    const createdRvmUnits: string[] = []

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
