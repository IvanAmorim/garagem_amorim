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

  const { items, customerId, vehicleId, quoteId, maintenanceRecordId } = parsed.data
  const itemIds = items.map((i) => i.id)

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
    const extractedItems = await db.extractedInvoiceItem.findMany({
      where: { id: { in: itemIds } },
      include: { uploadedDocument: { select: { id: true, invoiceRef: true, invoiceDate: true } } },
    })

    for (const item of extractedItems) {
      const option = items.find((i) => i.id === item.id)
      const customerDiscountApplied = option?.customerDiscountApplied ?? false

      const listPrice = Number(item.unitPrice)
      const purchaseUnitPrice = item.purchaseUnitPrice !== null ? Number(item.purchaseUnitPrice) : listPrice
      const discountPct = customerDiscountApplied ? (Number(item.supplierDiscountPct) || 0) : 0
      // unitPrice always stored as list price; discountPct reflects what the client gets
      const effectivePrice = listPrice * (1 - discountPct / 100)
      const total = Number(item.quantity) * effectivePrice * (1 + (Number(item.taxRate) || 0) / 100)

      await db.quoteItem.create({
        data: {
          quoteId,
          description: item.description,
          reference: item.reference,
          quantity: item.quantity,
          unitPrice: listPrice,
          discountPct,
          costPrice: purchaseUnitPrice,
          purchaseUnitPrice: purchaseUnitPrice,
          customerDiscountApplied,
          taxRate: item.taxRate ?? 23,
          total,
          supplierInvoiceRef: item.uploadedDocument.invoiceRef ?? null,
          purchaseDate: item.uploadedDocument.invoiceDate ?? null,
          uploadedDocumentId: item.uploadedDocument.id,
          extractedInvoiceItemId: item.id,
        },
      })
    }

    // Recalculate quote totals
    const quote = await db.quote.findUnique({
      where: { id: quoteId },
      include: { items: true, laborItems: true },
    })
    if (quote) {
      const itemsSubtotal = quote.items.reduce((acc, i) => {
        const discountedPrice = Number(i.unitPrice) * (1 - Number(i.discountPct) / 100)
        return acc + Number(i.quantity) * discountedPrice
      }, 0)
      const laborSubtotal = quote.laborItems.reduce((acc, i) => acc + Number(i.total), 0)
      const subtotal = itemsSubtotal + laborSubtotal - Number(quote.discount)
      const itemsTax = quote.items.reduce((acc, i) => {
        const discountedPrice = Number(i.unitPrice) * (1 - Number(i.discountPct) / 100)
        return acc + Number(i.quantity) * discountedPrice * (Number(i.taxRate) / 100)
      }, 0)
      await db.quote.update({
        where: { id: quoteId },
        data: { subtotal, taxAmount: itemsTax, total: subtotal + itemsTax },
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
    supplierDiscountPct?: number
    purchaseUnitPrice?: number
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
