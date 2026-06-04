"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { maintenanceSchema, type MaintenanceInput } from "@/lib/validations"
import type { ActionResult } from "@/types"
import { auth } from "@/auth"
import { generateNextQuoteNumber } from "@/app/actions/quotes"

async function requireAuth() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  return session
}

export async function createMaintenance(
  data: MaintenanceInput & { createQuote?: boolean }
): Promise<ActionResult<{ id: string; quoteId?: string }>> {
  await requireAuth()
  const parsed = maintenanceSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  let quoteId: string | undefined

  // Auto-create quote if requested
  if (data.createQuote) {
    const settings = await db.workshopSettings.findFirst()
    const prefix = settings?.quotePrefix ?? "ORC"
    const number = await generateNextQuoteNumber(prefix)

    const quote = await db.quote.create({
      data: {
        number,
        customerId: parsed.data.customerId,
        vehicleId: parsed.data.vehicleId,
        status: "DRAFT",
        taxRate: settings?.defaultTaxRate ?? 23,
        laborHourRate: settings?.laborHourRate ?? 50,
        discount: 0,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        notes: `Manutenção: ${parsed.data.description}`,
        terms: settings?.defaultTerms,
      },
    })

    quoteId = quote.id
  }

  const record = await db.maintenanceRecord.create({
    data: {
      customerId: parsed.data.customerId,
      vehicleId: parsed.data.vehicleId,
      date: new Date(parsed.data.date),
      mileage: parsed.data.mileage,
      description: parsed.data.description,
      laborHours: parsed.data.laborHours,
      technicianId: parsed.data.technicianId || null,
      quoteId: quoteId || parsed.data.quoteId || null,
      notes: parsed.data.notes,
    },
  })

  if (parsed.data.mileage) {
    await db.vehicle.update({
      where: { id: parsed.data.vehicleId },
      data: { mileage: parsed.data.mileage },
    })
  }

  revalidatePath("/manutencoes")
  revalidatePath(`/veiculos/${parsed.data.vehicleId}`)
  revalidatePath(`/clientes/${parsed.data.customerId}`)

  return { success: true, data: { id: record.id, quoteId } }
}

export async function updateMaintenance(id: string, data: MaintenanceInput): Promise<ActionResult> {
  await requireAuth()
  const parsed = maintenanceSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  await db.maintenanceRecord.update({
    where: { id },
    data: {
      customerId: parsed.data.customerId,
      vehicleId: parsed.data.vehicleId,
      date: new Date(parsed.data.date),
      mileage: parsed.data.mileage,
      description: parsed.data.description,
      laborHours: parsed.data.laborHours,
      technicianId: parsed.data.technicianId || null,
      quoteId: parsed.data.quoteId || null,
      notes: parsed.data.notes,
    },
  })

  revalidatePath("/manutencoes")
  revalidatePath(`/manutencoes/${id}`)
  return { success: true, data: undefined }
}

export async function deleteMaintenance(id: string): Promise<ActionResult> {
  await requireAuth()
  await db.maintenanceRecord.delete({ where: { id } })
  revalidatePath("/manutencoes")
  return { success: true, data: undefined }
}

export async function getMaintenanceRecords(filters?: {
  search?: string
  vehicleId?: string
  customerId?: string
}) {
  await requireAuth()
  return db.maintenanceRecord.findMany({
    where: {
      AND: [
        filters?.vehicleId ? { vehicleId: filters.vehicleId } : {},
        filters?.customerId ? { customerId: filters.customerId } : {},
        filters?.search
          ? {
              OR: [
                { description: { contains: filters.search, mode: "insensitive" } },
                { vehicle: { plate: { contains: filters.search, mode: "insensitive" } } },
                { customer: { name: { contains: filters.search, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    include: {
      customer: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, brand: true, model: true } },
      technician: { select: { id: true, name: true } },
      quote: {
        select: {
          id: true,
          number: true,
          status: true,
          items: {
            select: { description: true, quantity: true, unitPrice: true, discountPct: true },
          },
          laborItems: {
            select: { description: true, hours: true, total: true },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  })
}
