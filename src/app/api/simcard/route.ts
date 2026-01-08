import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const simCardSchema = z.object({
  phoneNumber: z.string().min(10, "Telefon numarası en az 10 haneli olmalı").max(10, "Telefon numarası en fazla 10 haneli olmalı"),
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
      where.phoneNumber = { contains: search, mode: "insensitive" }
    }

    if (status === "available") {
      where.status = "AVAILABLE"
    } else if (status === "assigned") {
      where.status = "ASSIGNED"
    }

    const simCards = await prisma.simCard.findMany({
      where,
      include: {
        _count: {
          select: { routers: true },
        },
        routers: {
          include: {
            rvmUnit: {
              select: {
                id: true,
                rvmId: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(simCards)
  } catch (error) {
    console.error("SimCard GET error:", error)
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
    const validatedData = simCardSchema.parse(body)

    // Check if phone number already exists
    const existing = await prisma.simCard.findUnique({
      where: { phoneNumber: validatedData.phoneNumber },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Bu telefon numarası zaten kayıtlı" },
        { status: 400 }
      )
    }

    const simCard = await prisma.simCard.create({
      data: {
        phoneNumber: validatedData.phoneNumber,
        status: "AVAILABLE",
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE",
        entityType: "SIMCARD",
        entityId: simCard.id,
        userId: session.user.id,
        details: { phoneNumber: simCard.phoneNumber },
      },
    })

    return NextResponse.json(simCard, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    console.error("SimCard POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
