"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { stockItemSchema, stockMovementSchema } from "@/lib/validations"
import type { ActionResult } from "@/types"
import { auth } from "@/auth"
import type { StockItemInput, StockMovementInput } from "@/lib/validations"

async function requireAuth() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  return session
}

export async function createStockItem(data: StockItemInput): Promise<ActionResult<{ id: string }>> {
  await requireAuth()
  const parsed = stockItemSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  const item = await db.stockItem.create({
    data: {
      ...parsed.data,
      quantity: parsed.data.quantity,
      minQuantity: parsed.data.minQuantity,
      status: parsed.data.quantity <= 0 ? "OUT_OF_STOCK" : parsed.data.quantity <= parsed.data.minQuantity ? "LOW" : "AVAILABLE",
    },
  })
  revalidatePath("/stock")
  return { success: true, data: { id: item.id } }
}

export async function updateStockItem(id: string, data: StockItemInput): Promise<ActionResult> {
  await requireAuth()
  const parsed = stockItemSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  const status = parsed.data.quantity <= 0 ? "OUT_OF_STOCK" : parsed.data.quantity <= parsed.data.minQuantity ? "LOW" : "AVAILABLE"
  await db.stockItem.update({ where: { id }, data: { ...parsed.data, status } })
  revalidatePath("/stock")
  revalidatePath(`/stock/${id}`)
  return { success: true, data: undefined }
}

export async function deleteStockItem(id: string): Promise<ActionResult> {
  await requireAuth()
  await db.stockItem.delete({ where: { id } })
  revalidatePath("/stock")
  return { success: true, data: undefined }
}

export async function addStockMovement(data: StockMovementInput): Promise<ActionResult> {
  await requireAuth()
  const parsed = stockMovementSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  const item = await db.stockItem.findUnique({ where: { id: parsed.data.stockItemId } })
  if (!item) return { success: false, error: "Item não encontrado" }

  const currentQty = Number(item.quantity)
  let newQty: number

  if (parsed.data.type === "IN") {
    newQty = currentQty + parsed.data.quantity
  } else if (parsed.data.type === "OUT") {
    newQty = currentQty - parsed.data.quantity
    if (newQty < 0) return { success: false, error: "Stock insuficiente" }
  } else {
    newQty = parsed.data.quantity
  }

  const newStatus = newQty <= 0 ? "OUT_OF_STOCK" : newQty <= Number(item.minQuantity) ? "LOW" : "AVAILABLE"

  await db.$transaction([
    db.stockMovement.create({
      data: {
        stockItemId: parsed.data.stockItemId,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        notes: parsed.data.notes,
      },
    }),
    db.stockItem.update({
      where: { id: parsed.data.stockItemId },
      data: { quantity: newQty, status: newStatus },
    }),
  ])

  revalidatePath("/stock")
  return { success: true, data: undefined }
}

export async function getStockItems(search?: string) {
  await requireAuth()
  return db.stockItem.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { internalRef: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
            { supplier: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ status: "asc" }, { name: "asc" }],
  })
}

export async function getStockItem(id: string) {
  await requireAuth()
  return db.stockItem.findUnique({
    where: { id },
    include: {
      movements: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  })
}
