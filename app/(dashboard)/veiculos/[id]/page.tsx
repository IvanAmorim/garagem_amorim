import { getVehicle } from "@/app/actions/vehicles"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Edit, Plus, FileText, Wrench, Gauge, Hash, Fuel, User, Package, StickyNote } from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency, decimalToNumber, getFuelTypeLabel, getQuoteStatusLabel } from "@/lib/utils"
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
            <div className="space-y-3">
              {vehicle.maintenanceRecords.map((m) => {
                const quoteItems = m.quote?.items ?? []
                const laborItems = m.quote?.laborItems ?? []
                const quoteHours = laborItems.reduce((s, i) => s + Number(i.hours), 0)
                const displayHours = quoteHours > 0 ? quoteHours : (m.laborHours ? Number(m.laborHours) : null)
                return (
                  <Card key={m.id} className="p-4">
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{m.description}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {m.quote && (
                            <Badge variant="outline" className="text-xs">
                              {getQuoteStatusLabel(m.quote.status)}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDate(m.date)}</span>
                        </div>
                      </div>

                      {/* Materials */}
                      {quoteItems.length > 0 && (
                        <div className="pl-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Material ({quoteItems.length} artigo{quoteItems.length !== 1 ? "s" : ""})
                          </p>
                          {quoteItems.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3 flex-shrink-0" />
                                {Number(item.quantity)} × {item.description}
                              </span>
                              <span className="flex-shrink-0 ml-2">
                                {formatCurrency(decimalToNumber(item.unitPrice) * (1 - decimalToNumber(item.discountPct) / 100) * decimalToNumber(item.quantity))}
                              </span>
                            </div>
                          ))}
                          {quoteItems.length > 3 && (
                            <p className="text-xs text-muted-foreground">+{quoteItems.length - 3} mais</p>
                          )}
                        </div>
                      )}

                      {/* Labor */}
                      {laborItems.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Mão de obra: {laborItems.map(i => `${i.description} (${Number(i.hours)}h)`).join(", ")}
                        </div>
                      )}

                      {/* Notes */}
                      {m.notes && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1">
                          <StickyNote className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span>{m.notes}</span>
                        </p>
                      )}

                      {/* Footer */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground border-t pt-2">
                        {m.mileage && (
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3 w-3" />{m.mileage.toLocaleString("pt-PT")} km
                          </span>
                        )}
                        {displayHours != null && (
                          <span>{displayHours}h{quoteHours > 0 ? " (orçamento)" : ""}</span>
                        )}
                        {m.technician && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />{m.technician.name}
                          </span>
                        )}
                        {m.quote && (
                          <Link href={`/orcamentos/${m.quote.id}`} className="flex items-center gap-1 text-primary hover:underline ml-auto">
                            <FileText className="h-3 w-3" />{m.quote.number}
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
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
