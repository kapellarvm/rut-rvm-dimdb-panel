import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@rutpanel.com" },
    update: {},
    create: {
      email: "admin@rutpanel.com",
      passwordHash: adminPassword,
      name: "Admin",
      role: "SUPER_ADMIN",
    },
  })
  console.log("Created admin user:", admin.email)

  // Create viewer user
  const viewerPassword = await bcrypt.hash("viewer123", 12)
  const viewer = await prisma.user.upsert({
    where: { email: "viewer@rutpanel.com" },
    update: {},
    create: {
      email: "viewer@rutpanel.com",
      passwordHash: viewerPassword,
      name: "Viewer",
      role: "VIEWER",
    },
  })
  console.log("Created viewer user:", viewer.email)

  // Create some sample DIM-DB entries
  const dimDbCodes = [
    "DIMDB-2024-001",
    "DIMDB-2024-002",
    "DIMDB-2024-003",
    "DIMDB-2024-004",
    "DIMDB-2024-005",
  ]

  for (const code of dimDbCodes) {
    await prisma.dimDb.upsert({
      where: { dimDbCode: code },
      update: {},
      create: {
        dimDbCode: code,
        description: `Sample DIM-DB ${code}`,
        status: "AVAILABLE",
      },
    })
  }
  console.log("Created sample DIM-DB entries")

  // Create sample RVM unit
  const rvm = await prisma.rvmUnit.upsert({
    where: { rvmId: "KPL0402511010" },
    update: {},
    create: {
      rvmId: "KPL0402511010",
      name: "Demo RVM",
      location: "Istanbul",
    },
  })
  console.log("Created sample RVM unit:", rvm.rvmId)

  // Create sample router
  await prisma.router.upsert({
    where: { serialNumber: "6006567539" },
    update: {},
    create: {
      boxNoPrefix: "RUT901000",
      boxNo: "029-2356",
      serialNumber: "6006567539",
      imei: "868291077043186",
      macAddress: "209727836AF6",
      firmware: "RUT9M_R_00.07.16.3",
      ssid: "RUT901_6AF8",
      wifiPassword: "Wq2z1DVf",
      devicePassword: "7v^QB?6p+",
      rvmUnitId: rvm.id,
    },
  })
  console.log("Created sample router")

  console.log("Seeding complete!")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
