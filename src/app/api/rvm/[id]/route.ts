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

    const rvmUnit = await prisma.rvmUnit.findUnique({
      where: { id },
      include: {
        routers: {
          include: {
            dimDb: true,
          },
        },
        _count: {
          select: { routers: true },
        },
      },
    })

    if (!rvmUnit) {
      return NextResponse.json({ error: "RVM not found" }, { status: 404 })
    }

    return NextResponse.json(rvmUnit)
  } catch (error) {
    console.error("RVM GET error:", error)
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

    const rvmUnit = await prisma.rvmUnit.update({
      where: { id },
      data: body,
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "UPDATE",
        entityType: "RVM",
        entityId: rvmUnit.id,
        userId: session.user.id,
        details: { rvmId: rvmUnit.rvmId },
      },
    })

    return NextResponse.json(rvmUnit)
  } catch (error) {
    console.error("RVM PATCH error:", error)
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

    // First, unlink all routers from this RVM
    await prisma.router.updateMany({
      where: { rvmUnitId: id },
      data: { rvmUnitId: null },
    })

    const rvmUnit = await prisma.rvmUnit.delete({
      where: { id },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "DELETE",
        entityType: "RVM",
        entityId: id,
        userId: session.user.id,
        details: { rvmId: rvmUnit.rvmId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("RVM DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
