"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { quoteSchema, quoteItemSchema, laborItemSchema } from "@/lib/validations"
import type { ActionResult } from "@/types"
import type { QuoteInput, QuoteItemInput, LaborItemInput } from "@/lib/validations"
import { auth } from "@/auth"
import { generateQuoteNumber } from "@/lib/utils"

async function requireAuth() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  return session
}

export function formatQuoteNumber(prefix: string, counter: number): string {
  return `${prefix}-${String(counter).padStart(5, "0")}`
}

export async function generateNextQuoteNumber(prefix: string): Promise<string> {
  const normalizedPrefix = prefix.trim()

  const lastQuote = await db.quote.findFirst({
    where: {
      number: {
        startsWith: `${normalizedPrefix}-`,
      },
    },
    orderBy: {
      number: "desc",
    },
    select: {
      number: true,
    },
  })

  const lastCounter = lastQuote
    ? Number(lastQuote.number.replace(`${normalizedPrefix}-`, ""))
    : 0

  const nextCounter = Number.isFinite(lastCounter) ? lastCounter + 1 : 1

  return formatQuoteNumber(normalizedPrefix, nextCounter)
}

export async function createQuote(data: QuoteInput): Promise<ActionResult<{ id: string }>> {
  await requireAuth()
  const parsed = quoteSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  const settings = await db.workshopSettings.findFirst()
  const prefix = settings?.quotePrefix ?? "ORC"
  const number = await generateNextQuoteNumber(prefix)

  const quote = await db.quote.create({
    data: {
      number,
      customerId: parsed.data.customerId,
      vehicleId: parsed.data.vehicleId || null,
      status: parsed.data.status,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      taxRate: parsed.data.taxRate,
      discount: parsed.data.discount,
      laborHourRate: parsed.data.laborHourRate ?? settings?.laborHourRate ?? 50,
      notes: parsed.data.notes,
      terms: parsed.data.terms ?? settings?.defaultTerms,
    },
  })

  if (settings) {
    await db.workshopSettings.update({
      where: { id: settings.id },
      data: { quoteCounter: counter + 1 },
    })
  }

  revalidatePath("/orcamentos")
  return { success: true, data: { id: quote.id } }
}

export async function updateQuote(id: string, data: QuoteInput): Promise<ActionResult> {
  await requireAuth()
  const parsed = quoteSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  await db.quote.update({
    where: { id },
    data: {
      customerId: parsed.data.customerId,
      vehicleId: parsed.data.vehicleId || null,
      status: parsed.data.status,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      taxRate: parsed.data.taxRate,
      discount: parsed.data.discount,
      laborHourRate: parsed.data.laborHourRate,
      notes: parsed.data.notes,
      terms: parsed.data.terms,
    },
  })

  revalidatePath("/orcamentos")
  revalidatePath(`/orcamentos/${id}`)
  return { success: true, data: undefined }
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  await requireAuth()
  // Return stock items to inventory
  const items = await db.quoteItem.findMany({
    where: { quoteId: id, stockItemId: { not: null } },
  })
  for (const item of items) {
    if (item.stockItemId) {
      await reverseStockDeduction(item.stockItemId, Number(item.quantity), id)
    }
  }
  await db.quote.delete({ where: { id } })
  revalidatePath("/orcamentos")
  return { success: true, data: undefined }
}

export async function addQuoteItem(
  quoteId: string,
  data: QuoteItemInput & { discountPct?: number }
): Promise<ActionResult> {
  await requireAuth()
  const parsed = quoteItemSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  const discountPct = data.discountPct ?? 0
  const priceAfterDiscount = parsed.data.unitPrice * (1 - discountPct / 100)
  const total = parsed.data.quantity * priceAfterDiscount * (1 + parsed.data.taxRate / 100)

  // Check stock availability if stock item
  if (parsed.data.stockItemId) {
    const stockItem = await db.stockItem.findUnique({
      where: { id: parsed.data.stockItemId },
    })
    if (!stockItem) return { success: false, error: "Item de stock não encontrado" }
    if (Number(stockItem.quantity) < parsed.data.quantity) {
      return {
        success: false,
        error: `Stock insuficiente. Disponível: ${Number(stockItem.quantity)} ${stockItem.unit}`,
      }
    }

    // Deduct from stock immediately
    const newQty = Number(stockItem.quantity) - parsed.data.quantity
    const newStatus =
      newQty <= 0 ? "OUT_OF_STOCK" : newQty <= Number(stockItem.minQuantity) ? "LOW" : "AVAILABLE"

    await db.$transaction([
      db.stockMovement.create({
        data: {
          stockItemId: parsed.data.stockItemId,
          type: "OUT",
          quantity: parsed.data.quantity,
          notes: `Alocado ao orçamento #${quoteId}`,
          quoteId,
        },
      }),
      db.stockItem.update({
        where: { id: parsed.data.stockItemId },
        data: { quantity: newQty, status: newStatus },
      }),
    ])
  }

  await db.quoteItem.create({
    data: {
      quoteId,
      stockItemId: parsed.data.stockItemId || null,
      description: parsed.data.description,
      reference: parsed.data.reference,
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      discountPct,
      taxRate: parsed.data.taxRate,
      total,
    },
  })

  await recalculateQuoteTotals(quoteId)
  revalidatePath(`/orcamentos/${quoteId}`)
  revalidatePath("/stock")
  return { success: true, data: undefined }
}

export async function updateQuoteItem(
  itemId: string,
  quoteId: string,
  data: QuoteItemInput & { discountPct?: number }
): Promise<ActionResult> {
  await requireAuth()
  const parsed = quoteItemSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  const discountPct = data.discountPct ?? 0
  const priceAfterDiscount = parsed.data.unitPrice * (1 - discountPct / 100)
  const total = parsed.data.quantity * priceAfterDiscount * (1 + parsed.data.taxRate / 100)

  await db.quoteItem.update({
    where: { id: itemId },
    data: {
      description: parsed.data.description,
      reference: parsed.data.reference,
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      discountPct,
      taxRate: parsed.data.taxRate,
      total,
    },
  })

  await recalculateQuoteTotals(quoteId)
  revalidatePath(`/orcamentos/${quoteId}`)
  return { success: true, data: undefined }
}

export async function removeQuoteItem(itemId: string, quoteId: string): Promise<ActionResult> {
  await requireAuth()
  const item = await db.quoteItem.findUnique({ where: { id: itemId } })
  if (!item) return { success: false, error: "Item não encontrado" }

  // Return stock if from stock
  if (item.stockItemId) {
    await reverseStockDeduction(item.stockItemId, Number(item.quantity), quoteId)
  }

  await db.quoteItem.delete({ where: { id: itemId } })
  await recalculateQuoteTotals(quoteId)
  revalidatePath(`/orcamentos/${quoteId}`)
  revalidatePath("/stock")
  return { success: true, data: undefined }
}

export async function addLaborItem(quoteId: string, data: LaborItemInput): Promise<ActionResult> {
  await requireAuth()
  const parsed = laborItemSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  await db.laborItem.create({
    data: {
      quoteId,
      description: parsed.data.description,
      hours: parsed.data.hours,
      hourRate: parsed.data.hourRate,
      total: parsed.data.hours * parsed.data.hourRate,
    },
  })

  await recalculateQuoteTotals(quoteId)
  revalidatePath(`/orcamentos/${quoteId}`)
  return { success: true, data: undefined }
}

export async function removeLaborItem(itemId: string, quoteId: string): Promise<ActionResult> {
  await requireAuth()
  await db.laborItem.delete({ where: { id: itemId } })
  await recalculateQuoteTotals(quoteId)
  revalidatePath(`/orcamentos/${quoteId}`)
  return { success: true, data: undefined }
}

async function reverseStockDeduction(stockItemId: string, quantity: number, quoteId: string) {
  const stockItem = await db.stockItem.findUnique({ where: { id: stockItemId } })
  if (!stockItem) return

  const newQty = Number(stockItem.quantity) + quantity
  const newStatus =
    newQty <= 0 ? "OUT_OF_STOCK" : newQty <= Number(stockItem.minQuantity) ? "LOW" : "AVAILABLE"

  await db.$transaction([
    db.stockMovement.create({
      data: {
        stockItemId,
        type: "IN",
        quantity,
        notes: `Devolvido ao stock (orçamento #${quoteId})`,
        quoteId,
      },
    }),
    db.stockItem.update({
      where: { id: stockItemId },
      data: { quantity: newQty, status: newStatus },
    }),
  ])
}

async function recalculateQuoteTotals(quoteId: string) {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: { items: true, laborItems: true },
  })
  if (!quote) return

  const itemsSubtotal = quote.items.reduce((acc, item) => {
    const discountedPrice = Number(item.unitPrice) * (1 - Number(item.discountPct) / 100)
    return acc + Number(item.quantity) * discountedPrice
  }, 0)
  const laborSubtotal = quote.laborItems.reduce((acc, item) => acc + Number(item.total), 0)
  const subtotal = itemsSubtotal + laborSubtotal - Number(quote.discount)
  const itemsTax = quote.items.reduce((acc, item) => {
    const discountedPrice = Number(item.unitPrice) * (1 - Number(item.discountPct) / 100)
    return acc + Number(item.quantity) * discountedPrice * (Number(item.taxRate) / 100)
  }, 0)
  const total = subtotal + itemsTax

  await db.quote.update({
    where: { id: quoteId },
    data: { subtotal, taxAmount: itemsTax, total },
  })
}

export async function getQuotes(search?: string, status?: string) {
  await requireAuth()
  return db.quote.findMany({
    where: {
      AND: [
        status && status !== "ALL" ? { status: status as never } : {},
        search
          ? {
              OR: [
                { number: { contains: search, mode: "insensitive" } },
                { customer: { name: { contains: search, mode: "insensitive" } } },
                { vehicle: { plate: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    include: {
      customer: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, brand: true, model: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getQuote(id: string) {
  await requireAuth()
  return db.quote.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, nif: true, address: true, discountRate: true } },
      vehicle: { select: { id: true, plate: true, brand: true, model: true } },
      items: { include: { stockItem: { select: { id: true, name: true, unit: true } } } },
      laborItems: true,
      uploadedDocuments: true,
    },
  })
}
