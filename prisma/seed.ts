import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import bcrypt from "bcryptjs"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Seeding database...")

  // Admin user
  const hashedPassword = await bcrypt.hash("admin123", 12)
  const admin = await db.user.upsert({
    where: { email: "admin@oficina.pt" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@oficina.pt",
      password: hashedPassword,
      role: "ADMIN",
    },
  })
  console.log("✅ Admin user:", admin.email)

  // Workshop settings
  const settings = await db.workshopSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Oficina do João",
      address: "Rua das Flores, 10, 1000-001 Lisboa",
      nif: "500123456",
      phone: "+351 212 345 678",
      email: "geral@oficina.pt",
      laborHourRate: 55,
      defaultTaxRate: 23,
      quotePrefix: "ORC",
      quoteCounter: 1,
      defaultTerms: "Orçamento válido por 30 dias. Garantia de 6 meses em mão de obra.",
      defaultNotes: "Preços com IVA incluído à taxa de 23%.",
    },
  })
  console.log("✅ Workshop settings created")

  // Customers
  const customer1 = await db.customer.create({
    data: {
      name: "Manuel Ferreira",
      phone: "+351 912 345 678",
      email: "manuel.ferreira@email.pt",
      nif: "123456789",
      address: "Rua da Liberdade, 45, Lisboa",
      status: "ACTIVE",
    },
  })

  const customer2 = await db.customer.create({
    data: {
      name: "Ana Costa",
      phone: "+351 935 678 901",
      email: "ana.costa@email.pt",
      nif: "987654321",
      address: "Avenida da República, 12, Porto",
      status: "ACTIVE",
    },
  })
  console.log("✅ Customers created")

  // Vehicles
  const vehicle1 = await db.vehicle.create({
    data: {
      plate: "AA-12-BB",
      brand: "Toyota",
      model: "Corolla",
      year: 2018,
      fuelType: "GASOLINE",
      mileage: 85000,
      customerId: customer1.id,
    },
  })

  const vehicle2 = await db.vehicle.create({
    data: {
      plate: "CC-34-DD",
      brand: "Volkswagen",
      model: "Golf",
      year: 2020,
      fuelType: "DIESEL",
      mileage: 42000,
      customerId: customer2.id,
    },
  })
  console.log("✅ Vehicles created")

  // Stock items
  const stockItems = await Promise.all([
    db.stockItem.create({
      data: {
        name: "Filtro de Óleo Bosch",
        internalRef: "FO-001",
        category: "Filtros",
        brand: "Bosch",
        quantity: 15,
        minQuantity: 5,
        unit: "UNIT",
        costPrice: 8.5,
        salePrice: 14.9,
        supplier: "AutoPeças Lisboa",
        status: "AVAILABLE",
      },
    }),
    db.stockItem.create({
      data: {
        name: "Óleo Motor 5W-30 5L",
        internalRef: "OM-001",
        category: "Óleos",
        brand: "Castrol",
        quantity: 3,
        minQuantity: 5,
        unit: "UNIT",
        costPrice: 28.0,
        salePrice: 42.0,
        supplier: "Castrol Portugal",
        status: "LOW",
      },
    }),
    db.stockItem.create({
      data: {
        name: "Pastilhas Travão Dianteiras",
        internalRef: "PT-001",
        category: "Travões",
        brand: "Textar",
        quantity: 0,
        minQuantity: 4,
        unit: "SET",
        costPrice: 32.0,
        salePrice: 55.0,
        supplier: "AutoPeças Lisboa",
        status: "OUT_OF_STOCK",
      },
    }),
  ])
  console.log("✅ Stock items created")

  // Quote
  const quote = await db.quote.create({
    data: {
      number: "ORC-00001",
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      status: "COMPLETED",
      taxRate: 23,
      laborHourRate: 55,
      discount: 0,
      subtotal: 113.0,
      taxAmount: 15.64,
      total: 128.64,
      notes: "Revisão programada 85.000km",
      terms: "Garantia de 6 meses em peças e mão de obra.",
    },
  })

  await db.quoteItem.createMany({
    data: [
      {
        quoteId: quote.id,
        description: "Filtro de Óleo Bosch",
        reference: "FO-001",
        quantity: 1,
        unitPrice: 14.9,
        taxRate: 23,
        total: 18.33,
      },
      {
        quoteId: quote.id,
        description: "Óleo Motor Castrol 5W-30 5L",
        reference: "OM-001",
        quantity: 1,
        unitPrice: 42.0,
        taxRate: 23,
        total: 51.66,
      },
    ],
  })

  await db.laborItem.create({
    data: {
      quoteId: quote.id,
      description: "Mão de obra - Revisão",
      hours: 1,
      hourRate: 55,
      total: 55,
    },
  })

  // Maintenance record
  await db.maintenanceRecord.create({
    data: {
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      date: new Date("2024-03-15"),
      mileage: 85000,
      description: "Revisão 85.000km: substituição de óleo motor, filtro de óleo e filtro de ar.",
      laborHours: 1,
      technicianId: admin.id,
      quoteId: quote.id,
      notes: "Próxima revisão nos 95.000km ou daqui a 12 meses.",
    },
  })
  console.log("✅ Quotes and maintenance created")

  console.log("\n🎉 Seed completed!")
  console.log("\n📋 Login credentials:")
  console.log("   Email: admin@oficina.pt")
  console.log("   Password: admin123")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
