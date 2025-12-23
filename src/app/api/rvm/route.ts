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

    return NextResponse.json(rvmUnits)
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
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
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
        { error: "Validation error", details: error.errors },
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
