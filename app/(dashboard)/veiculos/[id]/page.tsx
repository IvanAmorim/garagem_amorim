import { getVehicle } from "@/app/actions/vehicles"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Edit, Plus, FileText, Wrench, Gauge, Hash, Fuel, User } from "lucide-react"
import Link from "next/link"
import { formatDate, getFuelTypeLabel, getQuoteStatusLabel } from "@/lib/utils"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Ficha do Veículo" }

export default async function VeiculoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const vehicle = await getVehicle(id)
  if (!vehicle) notFound()

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/veiculos"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{vehicle.plate}</h1>
            <p className="text-sm text-muted-foreground">
              {vehicle.brand} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ""}
            </p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={`/veiculos/${id}/editar`}>
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">Editar</span>
          </Link>
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span>{getFuelTypeLabel(vehicle.fuelType)}</span>
          </div>
        </Card>
        {vehicle.mileage && (
          <Card className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span>{vehicle.mileage.toLocaleString("pt-PT")} km</span>
            </div>
          </Card>
        )}
        {vehicle.vin && (
          <Card className="p-3 col-span-2">
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-mono truncate">{vehicle.vin}</span>
            </div>
          </Card>
        )}
        <Card className="p-3 col-span-2 sm:col-span-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <Link href={`/clientes/${vehicle.customer.id}`} className="text-primary hover:underline">
              {vehicle.customer.name}
            </Link>
            {vehicle.customer.phone && (
              <span className="text-muted-foreground">· {vehicle.customer.phone}</span>
            )}
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button asChild size="sm">
          <Link href={`/orcamentos/novo?vehicleId=${id}&customerId=${vehicle.customerId}`}>
            <Plus className="h-4 w-4" />Novo Orçamento
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/manutencoes/nova?vehicleId=${id}&customerId=${vehicle.customerId}`}>
            <Plus className="h-4 w-4" />Nova Manutenção
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="maintenance">
        <TabsList>
          <TabsTrigger value="maintenance">
            <Wrench className="h-4 w-4 mr-1.5" />
            Manutenções ({vehicle.maintenanceRecords.length})
          </TabsTrigger>
          <TabsTrigger value="quotes">
            <FileText className="h-4 w-4 mr-1.5" />
            Orçamentos ({vehicle.quotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="mt-3">
          {vehicle.maintenanceRecords.length === 0 ? (
            <Card className="p-8 text-center">
              <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sem manutenções registadas</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {vehicle.maintenanceRecords.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-2">{m.description}</p>
                      {m.mileage && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Gauge className="h-3 w-3 inline mr-0.5" />
                          {m.mileage.toLocaleString("pt-PT")} km
                        </p>
                      )}
                      {m.technician && (
                        <p className="text-xs text-muted-foreground">
                          Técnico: {m.technician.name}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(m.date)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quotes" className="mt-3">
          {vehicle.quotes.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sem orçamentos</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {vehicle.quotes.map((q) => (
                <Link key={q.id} href={`/orcamentos/${q.id}`}>
                  <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{q.number}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getQuoteStatusLabel(q.status)}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(q.createdAt)}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
