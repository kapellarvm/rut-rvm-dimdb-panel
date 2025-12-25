import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const rvmSchema = z.object({
  rvmId: z.string().min(1, "RVM ID gerekli"),
  name: z.string().optional(),
  location: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const includeRouters = searchParams.get("includeRouters") === "true"
    const machineClass = searchParams.get("machineClass") || ""
    const year = searchParams.get("year") || ""
    const month = searchParams.get("month") || ""

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { rvmId: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ]
    }

    const rvmUnits = await prisma.rvmUnit.findMany({
      where,
      include: includeRouters
        ? {
            routers: {
              include: {
                dimDb: true,
              },
            },
            _count: {
              select: { routers: true },
            },
          }
        : {
            _count: {
              select: { routers: true },
            },
          },
      orderBy: { rvmId: "asc" },
    })

    // Filter by RVM ID components
    // Pattern: [Company 2-4][Class 2][Sep 1][Year 2][Month 2][Order 2-4]
    // Example: KPL0402511010 = KPL + 04 + 0 + 25 + 11 + 010
    const hasFilters = machineClass || year || month

    const filteredUnits = rvmUnits.filter((rvm) => {
      const cleaned = rvm.rvmId.replace(/\s+/g, "").toUpperCase()
      const match = cleaned.match(
        /^([A-Z]{2,4})(\d{2})(\d)(\d{2})(\d{2})(\d{2,4})$/
      )

      // If filters are active and format doesn't match, exclude this RVM
      if (!match) {
        return !hasFilters // Only include non-matching formats when no filters are active
      }

      const rvmClass = match[2]
      const rvmYear = match[4]
      const rvmMonth = match[5]

      if (machineClass && rvmClass !== machineClass) return false
      if (year && rvmYear !== year) return false
      if (month && rvmMonth !== month) return false

      return true
    })

    return NextResponse.json(filteredUnits)
  } catch (error) {
    console.error("RVM GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = rvmSchema.parse(body)

    const rvmUnit = await prisma.rvmUnit.create({
      data: validatedData,
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE",
        entityType: "RVM",
        entityId: rvmUnit.id,
        userId: session.user.id,
        details: { rvmId: rvmUnit.rvmId },
      },
    })

    return NextResponse.json(rvmUnit, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    console.error("RVM POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
