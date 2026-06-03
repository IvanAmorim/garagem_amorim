"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { customerSchema, type CustomerInput } from "@/lib/validations"
import type { ActionResult } from "@/types"
import { auth } from "@/auth"

async function requireAuth() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  return session
}

export async function createCustomer(data: CustomerInput): Promise<ActionResult<{ id: string }>> {
  await requireAuth()
  const parsed = customerSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos" }
  }

  const customer = await db.customer.create({ data: parsed.data })
  revalidatePath("/clientes")
  return { success: true, data: { id: customer.id } }
}

export async function updateCustomer(id: string, data: CustomerInput): Promise<ActionResult> {
  await requireAuth()
  const parsed = customerSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  await db.customer.update({ where: { id }, data: parsed.data })
  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  return { success: true, data: undefined }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  await requireAuth()
  await db.customer.delete({ where: { id } })
  revalidatePath("/clientes")
  return { success: true, data: undefined }
}

export async function getCustomers(search?: string) {
  await requireAuth()
  return db.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" } },
            { nif: { contains: search } },
            { vehicles: { some: { plate: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    include: {
      vehicles: { select: { id: true, plate: true, brand: true, model: true } },
      _count: { select: { quotes: true, maintenanceRecords: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getCustomer(id: string) {
  await requireAuth()
  return db.customer.findUnique({
    where: { id },
    include: {
      vehicles: {
        include: { _count: { select: { quotes: true, maintenanceRecords: true } } },
        orderBy: { createdAt: "desc" },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { vehicle: { select: { plate: true } } },
      },
      maintenanceRecords: {
        orderBy: { date: "desc" },
        take: 5,
        include: { vehicle: { select: { plate: true, brand: true, model: true } } },
      },
    },
  })
}
