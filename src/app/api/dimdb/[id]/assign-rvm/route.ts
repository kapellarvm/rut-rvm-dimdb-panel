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

    const { id } = await params
    const body = await request.json()
    const { rvmId, routerSerialNumber } = body

    if (!rvmId) {
      return NextResponse.json({ error: "RVM ID gerekli" }, { status: 400 })
    }

    // Check if DIM-DB exists
    const dimDb = await prisma.dimDb.findUnique({
      where: { id },
      include: { routers: true },
    })

    if (!dimDb) {
      return NextResponse.json({ error: "DIM-DB bulunamadı" }, { status: 404 })
    }

    // Check if already assigned
    if (dimDb.routers.length > 0) {
      return NextResponse.json(
        { error: "Bu DIM-DB zaten bir router'a atanmış" },
        { status: 400 }
      )
    }

    const normalizedRvmId = rvmId.trim().toUpperCase()
    const created: { rvm?: string; router?: string } = {}

    // Find or create RVM
    let rvmUnit = await prisma.rvmUnit.findUnique({
      where: { rvmId: normalizedRvmId },
      include: { routers: { include: { dimDb: true } } },
    })

    if (!rvmUnit) {
      rvmUnit = await prisma.rvmUnit.create({
        data: {
          rvmId: normalizedRvmId,
          name: `RVM ${normalizedRvmId}`,
        },
        include: { routers: { include: { dimDb: true } } },
      })
      created.rvm = normalizedRvmId
    }

    let router

    // If router serial number is provided, use that specific router
    if (routerSerialNumber && routerSerialNumber.trim()) {
      const normalizedSerial = routerSerialNumber.trim().toUpperCase()

      router = await prisma.router.findUnique({
        where: { serialNumber: normalizedSerial },
      })

      if (!router) {
        return NextResponse.json(
          { error: `Router "${normalizedSerial}" bulunamadı` },
          { status: 404 }
        )
      }

      if (router.dimDbId) {
        return NextResponse.json(
          { error: "Bu router'da zaten bir DIM-DB atanmış" },
          { status: 400 }
        )
      }

      // If router is not assigned to this RVM, assign it
      if (router.rvmUnitId !== rvmUnit.id) {
        await prisma.router.update({
          where: { id: router.id },
          data: { rvmUnitId: rvmUnit.id },
        })
      }
    } else {
      // Find a router on this RVM that doesn't have a DIM-DB
      router = rvmUnit.routers.find((r) => !r.dimDb)

      if (!router) {
        return NextResponse.json(
          {
            error: "Bu RVM'de DIM-DB atanabilecek boş router yok. Lütfen önce bir router ekleyin veya router seri numarası belirtin.",
          },
          { status: 400 }
        )
      }
    }

    // Assign DIM-DB to the router
    await prisma.router.update({
      where: { id: router.id },
      data: { dimDbId: id },
    })

    // Update DIM-DB status
    await prisma.dimDb.update({
      where: { id },
      data: { status: "ASSIGNED" },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "ASSIGN",
        entityType: "DIMDB",
        entityId: id,
        userId: session.user.id,
        details: {
          rvmId: normalizedRvmId,
          routerId: router.id,
          routerSerialNumber: router.serialNumber,
          created,
        },
      },
    })

    return NextResponse.json({
      success: true,
      rvmId: normalizedRvmId,
      routerSerialNumber: router.serialNumber,
      created,
    })
  } catch (error) {
    console.error("Assign RVM error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
