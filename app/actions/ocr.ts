"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { assignInvoiceItemSchema, type AssignInvoiceItemInput } from "@/lib/validations"
import type { ActionResult } from "@/types"
import { auth } from "@/auth"

async function requireAuth() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  return session
}

export async function getUnassignedItems() {
  await requireAuth()
  return db.extractedInvoiceItem.findMany({
    where: { status: "UNASSIGNED" },
    include: {
      uploadedDocument: true,
      customer: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, brand: true, model: true } },
      quote: { select: { id: true, number: true } },
      maintenanceRecord: { select: { id: true, description: true, date: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAllExtractedItems(status?: string) {
  await requireAuth()
  return db.extractedInvoiceItem.findMany({
    where: status && status !== "ALL" ? { status: status as never } : undefined,
    include: {
      uploadedDocument: true,
      customer: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, brand: true, model: true } },
      quote: { select: { id: true, number: true } },
      maintenanceRecord: { select: { id: true, description: true, date: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function assignInvoiceItems(data: AssignInvoiceItemInput): Promise<ActionResult> {
  await requireAuth()
  const parsed = assignInvoiceItemSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  const { itemIds, customerId, vehicleId, quoteId, maintenanceRecordId } = parsed.data

  await db.extractedInvoiceItem.updateMany({
    where: { id: { in: itemIds } },
    data: {
      status: "ASSIGNED",
      customerId: customerId || null,
      vehicleId: vehicleId || null,
      quoteId: quoteId || null,
      maintenanceRecordId: maintenanceRecordId || null,
    },
  })

  if (quoteId) {
    const items = await db.extractedInvoiceItem.findMany({
      where: { id: { in: itemIds } },
    })

    for (const item of items) {
      const total = Number(item.quantity) * Number(item.unitPrice) * (1 + (Number(item.taxRate) || 0) / 100)
      await db.quoteItem.create({
        data: {
          quoteId,
          description: item.description,
          reference: item.reference,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate ?? 23,
          total,
        },
      })
    }

    revalidatePath(`/orcamentos/${quoteId}`)
  }

  revalidatePath("/pecas-por-atribuir")
  return { success: true, data: undefined }
}

export async function ignoreInvoiceItem(id: string): Promise<ActionResult> {
  await requireAuth()
  await db.extractedInvoiceItem.update({
    where: { id },
    data: { status: "IGNORED" },
  })
  revalidatePath("/pecas-por-atribuir")
  return { success: true, data: undefined }
}

export async function updateExtractedItem(
  id: string,
  data: {
    description?: string
    reference?: string
    quantity?: number
    unitPrice?: number
    taxRate?: number
    total?: number
  }
): Promise<ActionResult> {
  await requireAuth()
  await db.extractedInvoiceItem.update({
    where: { id },
    data,
  })
  revalidatePath("/pecas-por-atribuir")
  return { success: true, data: undefined }
}
