import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const dimDbSchema = z.object({
  dimDbCode: z.string().min(1, "DIM-DB kodu gerekli"),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { dimDbCode: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status === "available") {
      where.status = "AVAILABLE"
    } else if (status === "assigned") {
      where.status = "ASSIGNED"
    }

    const dimDbList = await prisma.dimDb.findMany({
      where,
      include: {
        _count: {
          select: { routers: true },
        },
      },
      orderBy: { dimDbCode: "asc" },
    })

    return NextResponse.json(dimDbList)
  } catch (error) {
    console.error("DIM-DB GET error:", error)
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
    const validatedData = dimDbSchema.parse(body)

    const dimDb = await prisma.dimDb.create({
      data: validatedData,
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE",
        entityType: "DIMDB",
        entityId: dimDb.id,
        userId: session.user.id,
        details: { dimDbCode: dimDb.dimDbCode },
      },
    })

    return NextResponse.json(dimDb, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    console.error("DIM-DB POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
