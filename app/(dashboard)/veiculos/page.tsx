import { getVehicles } from "@/app/actions/vehicles"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Search, Car, Fuel } from "lucide-react"
import Link from "next/link"
import { getFuelTypeLabel } from "@/lib/utils"
import type { Metadata } from "next"
import { VehicleActions } from "@/components/veiculos/vehicle-actions"

export const metadata: Metadata = { title: "Veículos" }

export default async function VeiculosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const { search } = await searchParams
  const vehicles = await getVehicles(search)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Veículos</h1>
          <p className="text-sm text-muted-foreground">{vehicles.length} veículos</p>
        </div>
        <Button asChild>
          <Link href="/veiculos/novo">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Veículo</span>
          </Link>
        </Button>
      </div>

      <form className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="search"
          defaultValue={search}
          placeholder="Pesquisar por matrícula, marca, modelo ou cliente..."
          className="pl-9"
        />
      </form>

      {vehicles.length === 0 ? (
        <Card className="p-12 text-center">
          <Car className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum veículo encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Tente alterar a pesquisa" : "Registe o primeiro veículo"}
          </p>
          {!search && (
            <Button asChild className="mt-4">
              <Link href="/veiculos/novo">
                <Plus className="h-4 w-4" />
                Novo Veículo
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {vehicles.map((v) => (
            <Card key={v.id} className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/veiculos/${v.id}`} className="font-bold text-base hover:text-primary transition-colors">
                      {v.plate}
                    </Link>
                    <Badge variant="outline" className="text-xs">
                      <Fuel className="h-3 w-3 mr-1" />
                      {getFuelTypeLabel(v.fuelType)}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{v.brand} {v.model} {v.year ? `(${v.year})` : ""}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Link href={`/clientes/${v.customer.id}`} className="text-xs text-primary hover:underline">
                      {v.customer.name}
                    </Link>
                    {v.mileage && (
                      <span className="text-xs text-muted-foreground">{v.mileage.toLocaleString("pt-PT")} km</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span>{v._count.maintenanceRecords} serviços</span>
                    <span>·</span>
                    <span>{v._count.quotes} orçamentos</span>
                  </div>
                </div>
                <VehicleActions vehicleId={v.id} vehiclePlate={v.plate} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
