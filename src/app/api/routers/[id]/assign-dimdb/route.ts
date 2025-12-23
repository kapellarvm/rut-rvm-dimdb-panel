import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const assignSchema = z.object({
  dimDbId: z.string().nullable(),
})

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
    const { dimDbId } = assignSchema.parse(body)

    // Get current router
    const currentRouter = await prisma.router.findUnique({
      where: { id },
      select: { dimDbId: true, serialNumber: true },
    })

    if (!currentRouter) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    // Update router with new dimDbId
    const router = await prisma.router.update({
      where: { id },
      data: { dimDbId },
      include: {
        rvmUnit: true,
        dimDb: true,
      },
    })

    // Update DIM-DB status if needed
    if (dimDbId) {
      await prisma.dimDb.update({
        where: { id: dimDbId },
        data: { status: "ASSIGNED" },
      })
    }

    // If there was a previous assignment, check if we need to update its status
    if (currentRouter.dimDbId && currentRouter.dimDbId !== dimDbId) {
      const otherAssignments = await prisma.router.count({
        where: {
          dimDbId: currentRouter.dimDbId,
          id: { not: id },
        },
      })

      if (otherAssignments === 0) {
        await prisma.dimDb.update({
          where: { id: currentRouter.dimDbId },
          data: { status: "AVAILABLE" },
        })
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "ASSIGN",
        entityType: "ROUTER",
        entityId: router.id,
        userId: session.user.id,
        details: {
          serialNumber: router.serialNumber,
          dimDbId: dimDbId || "unassigned",
        },
      },
    })

    return NextResponse.json(router)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Assign DIM-DB error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
