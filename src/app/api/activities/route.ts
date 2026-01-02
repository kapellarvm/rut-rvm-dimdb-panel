import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const action = searchParams.get("action") || ""
    const entityType = searchParams.get("entityType") || ""

    const where: Record<string, unknown> = {}

    if (action) {
      where.action = action
    }

    if (entityType) {
      where.entityType = entityType
    }

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ])

    return NextResponse.json({
      data: activities,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("Activities error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
