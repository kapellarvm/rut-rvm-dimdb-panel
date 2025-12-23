import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [
      totalRouters,
      totalRvmUnits,
      assignedDimDb,
      unassignedRouters,
      recentActivity,
    ] = await Promise.all([
      prisma.router.count(),
      prisma.rvmUnit.count(),
      prisma.router.count({
        where: {
          dimDbId: { not: null },
        },
      }),
      prisma.router.count({
        where: {
          dimDbId: null,
        },
      }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true },
          },
        },
      }),
    ])

    return NextResponse.json({
      totalRouters,
      totalRvmUnits,
      assignedDimDb,
      unassignedRouters,
      recentActivity,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
