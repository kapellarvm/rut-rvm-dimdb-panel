import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: rvmId } = await params
    const body = await request.json()
    const { serialNumber } = body

    if (!serialNumber) {
      return NextResponse.json(
        { error: "Seri numarası gerekli" },
        { status: 400 }
      )
    }

    // Check if RVM exists
    const rvmUnit = await prisma.rvmUnit.findUnique({
      where: { id: rvmId },
    })

    if (!rvmUnit) {
      return NextResponse.json(
        { error: "RVM birimi bulunamadı" },
        { status: 404 }
      )
    }

    // Find the router by serial number
    const router = await prisma.router.findFirst({
      where: { serialNumber },
    })

    if (!router) {
      return NextResponse.json(
        { error: "Bu seri numarasına sahip router bulunamadı" },
        { status: 404 }
      )
    }

    // Check if router is already assigned to this RVM
    if (router.rvmUnitId === rvmId) {
      return NextResponse.json(
        { error: "Bu router zaten bu RVM'e atanmış" },
        { status: 400 }
      )
    }

    // Update router to assign it to the RVM
    const updatedRouter = await prisma.router.update({
      where: { id: router.id },
      data: { rvmUnitId: rvmId },
      include: { dimDb: true },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "ASSIGN",
        entityType: "ROUTER",
        entityId: router.id,
        userId: session.user.id,
        details: {
          serialNumber: router.serialNumber,
          rvmId: rvmUnit.rvmId,
          action: "Router assigned to RVM",
        },
      },
    })

    return NextResponse.json({
      success: true,
      router: updatedRouter,
    })
  } catch (error) {
    console.error("Router assign error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
