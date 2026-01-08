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

    const simCard = await prisma.simCard.findUnique({
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

    if (!simCard) {
      return NextResponse.json({ error: "SIM kart bulunamadı" }, { status: 404 })
    }

    return NextResponse.json(simCard)
  } catch (error) {
    console.error("SimCard GET error:", error)
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

    // If updating phone number, check uniqueness
    if (body.phoneNumber) {
      const existing = await prisma.simCard.findFirst({
        where: {
          phoneNumber: body.phoneNumber,
          NOT: { id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: "Bu telefon numarası zaten kayıtlı" },
          { status: 400 }
        )
      }
    }

    const simCard = await prisma.simCard.update({
      where: { id },
      data: body,
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "UPDATE",
        entityType: "SIMCARD",
        entityId: simCard.id,
        userId: session.user.id,
        details: { phoneNumber: simCard.phoneNumber },
      },
    })

    return NextResponse.json(simCard)
  } catch (error) {
    console.error("SimCard PATCH error:", error)
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

    // First, unlink all routers from this SIM card
    await prisma.router.updateMany({
      where: { simCardId: id },
      data: { simCardId: null },
    })

    const simCard = await prisma.simCard.delete({
      where: { id },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "DELETE",
        entityType: "SIMCARD",
        entityId: id,
        userId: session.user.id,
        details: { phoneNumber: simCard.phoneNumber },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("SimCard DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
