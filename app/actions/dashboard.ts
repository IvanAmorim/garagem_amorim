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
    db.quote.count({ where: { status: "SENT" } }),
    db.quote.count({ where: { status: "APPROVED" } }),
    db.maintenanceRecord.count({
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
    db.stockItem.count({ where: { status: "LOW" } }),
    db.stockItem.count({ where: { status: "OUT_OF_STOCK" } }),
    db.quote.findMany({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
        status: { in: ["APPROVED", "CONVERTED"] },
      },
      select: { total: true },
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

  const monthlyTotal = monthlyQuotes.reduce((acc, q) => acc + Number(q.total), 0)

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
