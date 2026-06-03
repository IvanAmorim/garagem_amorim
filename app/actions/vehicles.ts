"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { vehicleSchema, type VehicleInput } from "@/lib/validations"
import type { ActionResult } from "@/types"
import { auth } from "@/auth"

async function requireAuth() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  return session
}

export async function createVehicle(data: VehicleInput): Promise<ActionResult<{ id: string }>> {
  await requireAuth()
  const parsed = vehicleSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  const existing = await db.vehicle.findUnique({ where: { plate: parsed.data.plate } })
  if (existing) return { success: false, error: "Já existe um veículo com esta matrícula" }

  const vehicle = await db.vehicle.create({ data: parsed.data })
  revalidatePath("/veiculos")
  revalidatePath(`/clientes/${parsed.data.customerId}`)
  return { success: true, data: { id: vehicle.id } }
}

export async function updateVehicle(id: string, data: VehicleInput): Promise<ActionResult> {
  await requireAuth()
  const parsed = vehicleSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  await db.vehicle.update({ where: { id }, data: parsed.data })
  revalidatePath("/veiculos")
  revalidatePath(`/veiculos/${id}`)
  return { success: true, data: undefined }
}

export async function deleteVehicle(id: string): Promise<ActionResult> {
  await requireAuth()
  await db.vehicle.delete({ where: { id } })
  revalidatePath("/veiculos")
  return { success: true, data: undefined }
}

export async function getVehicles(search?: string) {
  await requireAuth()
  return db.vehicle.findMany({
    where: search
      ? {
          OR: [
            { plate: { contains: search, mode: "insensitive" } },
            { brand: { contains: search, mode: "insensitive" } },
            { model: { contains: search, mode: "insensitive" } },
            { customer: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      _count: { select: { quotes: true, maintenanceRecords: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getVehicle(id: string) {
  await requireAuth()
  return db.vehicle.findUnique({
    where: { id },
    include: {
      customer: true,
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      maintenanceRecords: {
        orderBy: { date: "desc" },
        take: 10,
        include: { technician: { select: { name: true } } },
      },
    },
  })
}
