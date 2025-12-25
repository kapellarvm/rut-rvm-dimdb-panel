import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const dimDb = await prisma.dimDb.findUnique({
      where: { id },
      include: {
        routers: {
          include: {
            rvmUnit: true,
          },
        },
        _count: {
          select: { routers: true },
        },
      },
    })

    if (!dimDb) {
      return NextResponse.json({ error: "DIM-DB not found" }, { status: 404 })
    }

    return NextResponse.json(dimDb)
  } catch (error) {
    console.error("DIM-DB GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const dimDb = await prisma.dimDb.update({
      where: { id },
      data: body,
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "UPDATE",
        entityType: "DIMDB",
        entityId: dimDb.id,
        userId: session.user.id,
        details: { dimDbCode: dimDb.dimDbCode },
      },
    })

    return NextResponse.json(dimDb)
  } catch (error) {
    console.error("DIM-DB PATCH error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // First, unlink all routers from this DIM-DB
    await prisma.router.updateMany({
      where: { dimDbId: id },
      data: { dimDbId: null },
    })

    const dimDb = await prisma.dimDb.delete({
      where: { id },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "DELETE",
        entityType: "DIMDB",
        entityId: id,
        userId: session.user.id,
        details: { dimDbCode: dimDb.dimDbCode },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DIM-DB DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
