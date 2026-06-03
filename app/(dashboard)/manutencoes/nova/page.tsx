import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceForm } from "@/components/manutencoes/maintenance-form"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Nova Manutenção" }

export default async function NovaManutencaoPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string; customerId?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { vehicleId, customerId } = await searchParams

  const [customers, vehicles, technicians, quotes] = await Promise.all([
    db.customer.findMany({ select: { id: true, name: true }, where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.vehicle.findMany({ select: { id: true, plate: true, brand: true, model: true, customerId: true }, orderBy: { plate: "asc" } }),
    db.user.findMany({ select: { id: true, name: true }, where: { role: { in: ["ADMIN", "MECHANIC"] } }, orderBy: { name: "asc" } }),
    db.quote.findMany({ select: { id: true, number: true, customerId: true, vehicleId: true }, where: { status: { in: ["APPROVED", "SENT"] } }, orderBy: { createdAt: "desc" } }),
  ])

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/manutencoes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Nova Manutenção</h1>
          <p className="text-sm text-muted-foreground">Registar intervenção</p>
        </div>
      </div>
      <MaintenanceForm
        customers={customers}
        vehicles={vehicles}
        technicians={technicians}
        quotes={quotes}
        defaultCustomerId={customerId}
        defaultVehicleId={vehicleId}
      />
    </div>
  )
}
