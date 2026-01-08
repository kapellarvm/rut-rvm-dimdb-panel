import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface ConsistencyReport {
  orphanedDimDbIds: number
  orphanedRvmUnitIds: number
  assignedButNoRouter: number
  availableButHasRouter: number
  fixed: boolean
  details: {
    orphanedDimDbRouters: string[]
    orphanedRvmRouters: string[]
    dimDbStatusFixed: string[]
  }
}

// GET - Check consistency issues
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const report = await checkConsistency()
    return NextResponse.json(report)
  } catch (error) {
    console.error("Consistency check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Fix consistency issues
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { dryRun = false } = body

    const report = await fixConsistency(dryRun)

    // Log activity
    if (!dryRun) {
      await prisma.activityLog.create({
        data: {
          action: "FIX_CONSISTENCY",
          entityType: "SYSTEM",
          userId: session.user.id,
          details: JSON.parse(JSON.stringify(report)),
        },
      })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Consistency fix error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function checkConsistency(): Promise<ConsistencyReport> {
  // 1. Orphaned dimDbId (dimDbId exists but DimDb record doesn't)
  const orphanedDimDbRouters = await prisma.$queryRaw<Array<{
    id: string
    box_no: string
    dimdb_id: string
  }>>`
    SELECT r.id, r.box_no, r.dimdb_id
    FROM routers r
    WHERE r.dimdb_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM dimdb_list d WHERE d.id = r.dimdb_id
    )
  `

  // 2. Orphaned rvmUnitId (rvmUnitId exists but RvmUnit record doesn't)
  const orphanedRvmRouters = await prisma.$queryRaw<Array<{
    id: string
    box_no: string
    rvm_unit_id: string
  }>>`
    SELECT r.id, r.box_no, r.rvm_unit_id
    FROM routers r
    WHERE r.rvm_unit_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM rvm_units ru WHERE ru.id = r.rvm_unit_id
    )
  `

  // 3. DimDb ASSIGNED but no router linked
  const assignedButNoRouter = await prisma.dimDb.findMany({
    where: {
      status: "ASSIGNED",
      routers: { none: {} },
    },
  })

  // 4. DimDb AVAILABLE but has router linked
  const availableButHasRouter = await prisma.dimDb.findMany({
    where: {
      status: "AVAILABLE",
      routers: { some: {} },
    },
  })

  return {
    orphanedDimDbIds: orphanedDimDbRouters.length,
    orphanedRvmUnitIds: orphanedRvmRouters.length,
    assignedButNoRouter: assignedButNoRouter.length,
    availableButHasRouter: availableButHasRouter.length,
    fixed: false,
    details: {
      orphanedDimDbRouters: orphanedDimDbRouters.map((r) => r.box_no),
      orphanedRvmRouters: orphanedRvmRouters.map((r) => r.box_no),
      dimDbStatusFixed: [
        ...assignedButNoRouter.map((d) => `${d.dimDbCode} (ASSIGNED->AVAILABLE)`),
        ...availableButHasRouter.map((d) => `${d.dimDbCode} (AVAILABLE->ASSIGNED)`),
      ],
    },
  }
}

async function fixConsistency(dryRun: boolean): Promise<ConsistencyReport> {
  const report = await checkConsistency()

  if (dryRun) {
    return report
  }

  // Fix orphaned dimDbId
  if (report.orphanedDimDbIds > 0) {
    const orphanedRouters = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT r.id FROM routers r
      WHERE r.dimdb_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM dimdb_list d WHERE d.id = r.dimdb_id)
    `
    await prisma.router.updateMany({
      where: { id: { in: orphanedRouters.map((r) => r.id) } },
      data: { dimDbId: null },
    })
  }

  // Fix orphaned rvmUnitId
  if (report.orphanedRvmUnitIds > 0) {
    const orphanedRouters = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT r.id FROM routers r
      WHERE r.rvm_unit_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM rvm_units ru WHERE ru.id = r.rvm_unit_id)
    `
    await prisma.router.updateMany({
      where: { id: { in: orphanedRouters.map((r) => r.id) } },
      data: { rvmUnitId: null },
    })
  }

  // Fix ASSIGNED but no router -> set to AVAILABLE
  if (report.assignedButNoRouter > 0) {
    await prisma.dimDb.updateMany({
      where: {
        status: "ASSIGNED",
        routers: { none: {} },
      },
      data: { status: "AVAILABLE" },
    })
  }

  // Fix AVAILABLE but has router -> set to ASSIGNED
  if (report.availableButHasRouter > 0) {
    await prisma.dimDb.updateMany({
      where: {
        status: "AVAILABLE",
        routers: { some: {} },
      },
      data: { status: "ASSIGNED" },
    })
  }

  return { ...report, fixed: true }
}
