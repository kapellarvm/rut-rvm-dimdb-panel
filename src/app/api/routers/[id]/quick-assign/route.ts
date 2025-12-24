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
    const body = await request.json()
    const { rvmId, dimDbCode } = body

    // Check if router exists
    const router = await prisma.router.findUnique({
      where: { id },
    })

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    let rvmUnitId: string | null = null
    let dimDbId: string | null = null
    const created: { rvm?: string; dimDb?: string } = {}

    // Handle RVM
    if (rvmId && rvmId.trim()) {
      const normalizedRvmId = rvmId.trim().toUpperCase()

      // Check if RVM exists
      let rvmUnit = await prisma.rvmUnit.findUnique({
        where: { rvmId: normalizedRvmId },
      })

      // Create if doesn't exist
      if (!rvmUnit) {
        rvmUnit = await prisma.rvmUnit.create({
          data: {
            rvmId: normalizedRvmId,
            name: `RVM ${normalizedRvmId}`,
          },
        })
        created.rvm = normalizedRvmId
      }

      rvmUnitId = rvmUnit.id
    }

    // Handle DIM-DB
    if (dimDbCode && dimDbCode.trim()) {
      const normalizedDimDbCode = dimDbCode.trim()

      // Check if DIM-DB exists
      let dimDb = await prisma.dimDb.findUnique({
        where: { dimDbCode: normalizedDimDbCode },
      })

      // Create if doesn't exist
      if (!dimDb) {
        dimDb = await prisma.dimDb.create({
          data: {
            dimDbCode: normalizedDimDbCode,
            status: "ASSIGNED",
          },
        })
        created.dimDb = normalizedDimDbCode
      } else {
        // Update status to ASSIGNED
        await prisma.dimDb.update({
          where: { id: dimDb.id },
          data: { status: "ASSIGNED" },
        })
      }

      dimDbId = dimDb.id
    }

    // Update router with new assignments
    const updatedRouter = await prisma.router.update({
      where: { id },
      data: {
        rvmUnitId,
        dimDbId,
      },
      include: {
        rvmUnit: true,
        dimDb: true,
      },
    })

    // If previous DIM-DB was assigned and now unassigned, update its status
    if (router.dimDbId && router.dimDbId !== dimDbId) {
      // Check if any other router uses this DIM-DB
      const otherRouters = await prisma.router.count({
        where: {
          dimDbId: router.dimDbId,
          id: { not: id },
        },
      })

      if (otherRouters === 0) {
        await prisma.dimDb.update({
          where: { id: router.dimDbId },
          data: { status: "AVAILABLE" },
        })
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "ASSIGN",
        entityType: "ROUTER",
        entityId: id,
        userId: session.user.id,
        details: {
          rvmId: rvmId || null,
          dimDbCode: dimDbCode || null,
          created,
        },
      },
    })

    return NextResponse.json({
      router: updatedRouter,
      created,
    })
  } catch (error) {
    console.error("Quick assign error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
