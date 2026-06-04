import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { MaintenanceForm } from "@/components/manutencoes/maintenance-form"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Editar Manutenção" }

export default async function EditarManutencaoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params

  const record = await db.maintenanceRecord.findUnique({ where: { id } })
  if (!record) notFound()

  const [customers, vehicles, technicians, quotes] = await Promise.all([
    db.customer.findMany({ select: { id: true, name: true }, where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.vehicle.findMany({ select: { id: true, plate: true, brand: true, model: true, customerId: true }, orderBy: { plate: "asc" } }),
    db.user.findMany({ select: { id: true, name: true }, where: { role: { in: ["ADMIN", "MECHANIC"] } }, orderBy: { name: "asc" } }),
    db.quote.findMany({
      select: { id: true, number: true, customerId: true, vehicleId: true },
      where: {
        OR: [
          { status: { in: ["DRAFT", "IN_PROGRESS"] } },
          // Always include the currently-linked quote even if its status changed
          ...(record.quoteId ? [{ id: record.quoteId }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/manutencoes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Editar Manutenção</h1>
          <p className="text-sm text-muted-foreground">Atualizar registo de intervenção</p>
        </div>
      </div>
      <MaintenanceForm
        customers={customers}
        vehicles={vehicles}
        technicians={technicians}
        quotes={quotes}
        initialData={{
          id: record.id,
          customerId: record.customerId,
          vehicleId: record.vehicleId,
          date: record.date,
          mileage: record.mileage,
          description: record.description,
          laborHours: record.laborHours != null ? Number(record.laborHours) : null,
          technicianId: record.technicianId,
          quoteId: record.quoteId,
          notes: record.notes,
        }}
      />
    </div>
  )
}
