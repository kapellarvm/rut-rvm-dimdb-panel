import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateRouterSchema = z.object({
  boxNoPrefix: z.string().optional(),
  boxNo: z.string().optional(),
  serialNumber: z.string().optional(),
  imei: z.string().optional(),
  macAddress: z.string().optional(),
  firmware: z.string().optional(),
  ssid: z.string().optional(),
  wifiPassword: z.string().optional(),
  devicePassword: z.string().optional(),
  rvmUnitId: z.string().nullable().optional(),
  dimDbId: z.string().nullable().optional(),
})

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

    const router = await prisma.router.findUnique({
      where: { id },
      include: {
        rvmUnit: true,
        dimDb: true,
      },
    })

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    return NextResponse.json(router)
  } catch (error) {
    console.error("Router GET error:", error)
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
    const validatedData = updateRouterSchema.parse(body)

    const router = await prisma.router.update({
      where: { id },
      data: validatedData,
      include: {
        rvmUnit: true,
        dimDb: true,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "UPDATE",
        entityType: "ROUTER",
        entityId: router.id,
        userId: session.user.id,
        details: { serialNumber: router.serialNumber },
      },
    })

    return NextResponse.json(router)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Router PATCH error:", error)
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

    const router = await prisma.router.delete({
      where: { id },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "DELETE",
        entityType: "ROUTER",
        entityId: id,
        userId: session.user.id,
        details: { serialNumber: router.serialNumber },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Router DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
