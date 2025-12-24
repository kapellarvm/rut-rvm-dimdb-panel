import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get RVM with unassigned routers
    const rvmUnit = await prisma.rvmUnit.findUnique({
      where: { id },
      include: {
        routers: {
          where: {
            dimDbId: null,
          },
        },
      },
    })

    if (!rvmUnit) {
      return NextResponse.json({ error: "RVM not found" }, { status: 404 })
    }

    if (rvmUnit.routers.length === 0) {
      return NextResponse.json({
        message: "No unassigned routers found",
        created: 0,
      })
    }

    const createdDimDbs: string[] = []

    // Create DIM-DB for each unassigned router
    for (const router of rvmUnit.routers) {
      // Generate DIM-DB code: RVM_ID + BOX_NO (e.g., KPL0402511010_R001)
      const dimDbCode = `${rvmUnit.rvmId}_${router.boxNo}`

      // Check if this DIM-DB code already exists
      let dimDb = await prisma.dimDb.findUnique({
        where: { dimDbCode },
      })

      if (!dimDb) {
        // Create new DIM-DB
        dimDb = await prisma.dimDb.create({
          data: {
            dimDbCode,
            description: `Auto-created for ${rvmUnit.rvmId} - ${router.boxNo}`,
            status: "ASSIGNED",
          },
        })
        createdDimDbs.push(dimDbCode)
      } else {
        // Update status if exists
        await prisma.dimDb.update({
          where: { id: dimDb.id },
          data: { status: "ASSIGNED" },
        })
      }

      // Link router to DIM-DB
      await prisma.router.update({
        where: { id: router.id },
        data: { dimDbId: dimDb.id },
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "AUTO_ASSIGN_DIMDB",
        entityType: "RVM",
        entityId: id,
        userId: session.user.id,
        details: {
          rvmId: rvmUnit.rvmId,
          routerCount: rvmUnit.routers.length,
          createdDimDbs,
        },
      },
    })

    return NextResponse.json({
      message: `${rvmUnit.routers.length} router için DIM-DB oluşturuldu`,
      created: createdDimDbs.length,
      assigned: rvmUnit.routers.length,
      dimDbCodes: createdDimDbs,
    })
  } catch (error) {
    console.error("Auto DIM-DB creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
