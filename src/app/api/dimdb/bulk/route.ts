import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const bulkSchema = z.object({
  dimDbCodes: z.array(z.string().min(1)),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { dimDbCodes } = bulkSchema.parse(body)

    // Filter out existing codes
    const existingCodes = await prisma.dimDb.findMany({
      where: {
        dimDbCode: { in: dimDbCodes },
      },
      select: { dimDbCode: true },
    })

    const existingSet = new Set(existingCodes.map((d) => d.dimDbCode))
    const newCodes = dimDbCodes.filter((code) => !existingSet.has(code))

    if (newCodes.length === 0) {
      return NextResponse.json({
        created: 0,
        skipped: dimDbCodes.length,
        message: "All codes already exist",
      })
    }

    // Create new DIM-DB entries
    const created = await prisma.dimDb.createMany({
      data: newCodes.map((code) => ({
        dimDbCode: code,
        status: "AVAILABLE",
      })),
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE",
        entityType: "DIMDB",
        userId: session.user.id,
        details: {
          action: "bulk_create",
          count: created.count,
        },
      },
    })

    return NextResponse.json({
      created: created.count,
      skipped: dimDbCodes.length - newCodes.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    console.error("DIM-DB bulk POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
