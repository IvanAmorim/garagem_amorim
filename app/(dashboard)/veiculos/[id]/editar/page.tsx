import { getVehicle } from "@/app/actions/vehicles"
import { VehicleForm } from "@/components/veiculos/vehicle-form"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Editar Veículo" }

export default async function EditarVeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const [vehicle, customers] = await Promise.all([
    getVehicle(id),
    db.customer.findMany({
      select: { id: true, name: true },
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ])

  if (!vehicle) notFound()

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/veiculos/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Editar Veículo</h1>
          <p className="text-sm text-muted-foreground">{vehicle.plate}</p>
        </div>
      </div>
      <VehicleForm vehicle={{
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        mileage: vehicle.mileage,
        fuelType: vehicle.fuelType,
        notes: vehicle.notes,
        customerId: vehicle.customerId,
      }} customers={customers} />
    </div>
  )
}
