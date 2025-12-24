import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all RVM IDs
    const rvmUnits = await prisma.rvmUnit.findMany({
      select: { rvmId: true },
    })

    // Parse and extract unique components
    const machineClasses = new Set<string>()
    const years = new Set<string>()
    const months = new Set<string>()

    // Pattern: [Company 2-4][Class 2][Sep 1][Year 2][Month 2][Order 2-4]
    // Example: KPL0402511010 = KPL + 04 + 0 + 25 + 11 + 010
    for (const rvm of rvmUnits) {
      const cleaned = rvm.rvmId.replace(/\s+/g, "").toUpperCase()
      const match = cleaned.match(
        /^([A-Z]{2,4})(\d{2})(\d)(\d{2})(\d{2})(\d{2,4})$/
      )

      if (match) {
        machineClasses.add(match[2])
        years.add(match[4])
        // Only add valid months (01-12)
        const monthNum = parseInt(match[5], 10)
        if (monthNum >= 1 && monthNum <= 12) {
          months.add(match[5])
        }
      }
    }

    return NextResponse.json({
      machineClasses: Array.from(machineClasses).sort(),
      years: Array.from(years).sort(),
      months: Array.from(months).sort(),
    })
  } catch (error) {
    console.error("RVM filters error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
