import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const routerSchema = z.object({
  boxNoPrefix: z.string().optional(),
  boxNo: z.string().min(1, "Box No gerekli"),
  serialNumber: z.string().min(1, "Seri numarası gerekli"),
  imei: z.string().length(15, "IMEI 15 haneli olmalı"),
  macAddress: z.string().min(1, "MAC adresi gerekli"),
  firmware: z.string().optional(),
  ssid: z.string().optional(),
  wifiPassword: z.string().optional(),
  devicePassword: z.string().optional(),
  rvmUnitId: z.string().optional(),
  dimDbId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const search = searchParams.get("search") || ""
    const rvmUnitId = searchParams.get("rvmUnitId")
    const rvmStatus = searchParams.get("rvmStatus")
    const dimDbStatus = searchParams.get("dimDbStatus")
    const sortField = searchParams.get("sortField") || "createdAt"
    const sortDir = searchParams.get("sortDir") || "desc"

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: "insensitive" } },
        { imei: { contains: search, mode: "insensitive" } },
        { macAddress: { contains: search, mode: "insensitive" } },
        { ssid: { contains: search, mode: "insensitive" } },
        { boxNo: { contains: search, mode: "insensitive" } },
      ]
    }

    if (rvmUnitId) {
      where.rvmUnitId = rvmUnitId
    }

    // RVM status filter
    if (rvmStatus === "assigned") {
      where.rvmUnitId = { not: null }
    } else if (rvmStatus === "unassigned") {
      where.rvmUnitId = null
    }

    // DIM-DB status filter
    if (dimDbStatus === "assigned") {
      where.dimDbId = { not: null }
    } else if (dimDbStatus === "unassigned") {
      where.dimDbId = null
    }

    const [routers, total] = await Promise.all([
      prisma.router.findMany({
        where,
        include: {
          rvmUnit: true,
          dimDb: true,
        },
        orderBy: { [sortField]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.router.count({ where }),
    ])

    return NextResponse.json({
      data: routers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("Routers GET error:", error)
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
    const validatedData = routerSchema.parse(body)

    const router = await prisma.router.create({
      data: validatedData,
      include: {
        rvmUnit: true,
        dimDb: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE",
        entityType: "ROUTER",
        entityId: router.id,
        userId: session.user.id,
        details: { serialNumber: router.serialNumber },
      },
    })

    return NextResponse.json(router, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Router POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
