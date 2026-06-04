"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { startOfMonth, endOfMonth } from "date-fns"
import type { DashboardStats } from "@/types"

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [
    totalCustomers,
    totalVehicles,
    pendingQuotes,
    approvedQuotes,
    activeServices,
    lowStockItems,
    outOfStockItems,
    monthlyQuotes,
    recentMaintenance,
  ] = await Promise.all([
    db.customer.count({ where: { status: "ACTIVE" } }),
    db.vehicle.count(),
    db.quote.count({ where: { status: "IN_PROGRESS" } }),
    db.quote.count({ where: { status: "COMPLETED" } }),
    db.maintenanceRecord.count({
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
    db.stockItem.count({ where: { status: "LOW" } }),
    db.stockItem.count({ where: { status: "OUT_OF_STOCK" } }),
    db.quote.findMany({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        status: { in: ["COMPLETED", "PAID"] },
      },
      include: {
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            costPrice: true,
            discountPct: true,
          },
        },
        laborItems: { select: { total: true } },
      },
    }),
    db.maintenanceRecord.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        technician: { select: { id: true, name: true } },
        quote: { select: { id: true, number: true } },
      },
    }),
  ])

  // Monthly profit = labor revenue + parts margin
  // Parts margin: if costPrice known → sellingPrice - costPrice; else → unitPrice * discountPct%
  const monthlyTotal = monthlyQuotes.reduce((acc, q) => {
    const laborProfit = q.laborItems.reduce((s, i) => s + Number(i.total), 0)
    const partsProfit = q.items.reduce((s, i) => {
      const sellingPrice = Number(i.unitPrice) * (1 - Number(i.discountPct) / 100)
      if (i.costPrice !== null) {
        return s + Number(i.quantity) * Math.max(0, sellingPrice - Number(i.costPrice))
      }
      // Fallback: supplier discount not passed to customer = profit estimate
      return s + Number(i.quantity) * Number(i.unitPrice) * (Number(i.discountPct) / 100)
    }, 0)
    return acc + laborProfit + partsProfit
  }, 0)

  return {
    totalCustomers,
    totalVehicles,
    pendingQuotes,
    approvedQuotes,
    activeServices,
    lowStockItems,
    outOfStockItems,
    monthlyTotal,
    recentMaintenance: recentMaintenance as never,
  }
}
