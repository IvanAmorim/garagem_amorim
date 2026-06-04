import { getMaintenanceRecords } from "@/app/actions/maintenance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Wrench, Gauge, Calendar, User, Package, FileText, StickyNote, Edit } from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency, decimalToNumber, getQuoteStatusLabel } from "@/lib/utils"
import type { Metadata } from "next"
import { DeleteMaintenanceButton } from "@/components/manutencoes/delete-maintenance-button"

export const metadata: Metadata = { title: "Manutenções" }

export default async function ManutencoesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const { search } = await searchParams
  const records = await getMaintenanceRecords({ search })

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Manutenções</h1>
          <p className="text-sm text-muted-foreground">{records.length} registos</p>
        </div>
        <Button asChild>
          <Link href="/manutencoes/nova">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Manutenção</span>
          </Link>
        </Button>
      </div>

      <form className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="search"
          defaultValue={search}
          placeholder="Pesquisar por cliente, veículo ou descrição..."
          className="pl-9"
        />
      </form>

      {records.length === 0 ? (
        <Card className="p-12 text-center">
          <Wrench className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhuma manutenção encontrada</p>
          {!search && (
            <Button asChild className="mt-4">
              <Link href="/manutencoes/nova"><Plus className="h-4 w-4" />Nova Manutenção</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const quoteItems = record.quote?.items ?? []
            const laborItems = record.quote?.laborItems ?? []
            const quoteHours = laborItems.reduce((s, i) => s + Number(i.hours), 0)
            const displayHours = quoteHours > 0 ? quoteHours : (record.laborHours ? Number(record.laborHours) : null)

            return (
              <Card key={record.id} className="p-4 hover:shadow-sm transition-shadow">
                <div className="space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wrench className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{record.customer.name}</p>
                        <Link href={`/veiculos/${record.vehicle.id}`} className="text-xs text-primary hover:underline">
                          {record.vehicle.plate} · {record.vehicle.brand} {record.vehicle.model}
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {record.quote && (
                        <Badge variant="outline" className="text-xs">
                          {getQuoteStatusLabel(record.quote.status)}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(record.date)}
                      </span>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/manutencoes/${record.id}/editar`}>
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <DeleteMaintenanceButton id={record.id} description={record.description} />
                    </div>
                  </div>

                  {/* Work done */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Trabalho efetuado</p>
                    <p className="text-sm">{record.description}</p>
                  </div>

                  {/* Materials from linked quote */}
                  {quoteItems.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Material utilizado ({quoteItems.length} artigo{quoteItems.length !== 1 ? "s" : ""})
                      </p>
                      <div className="space-y-0.5">
                        {quoteItems.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Package className="h-3 w-3 flex-shrink-0" />
                              {Number(item.quantity)} × {item.description}
                            </span>
                            <span className="text-muted-foreground flex-shrink-0 ml-2">
                              {formatCurrency(Number(item.unitPrice) * (1 - Number(item.discountPct) / 100) * Number(item.quantity))}
                            </span>
                          </div>
                        ))}
                        {quoteItems.length > 4 && (
                          <p className="text-xs text-muted-foreground">+{quoteItems.length - 4} mais artigos</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Labor from linked quote */}
                  {laborItems.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Mão de obra</p>
                      <div className="space-y-0.5">
                        {laborItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{item.description} ({Number(item.hours)}h)</span>
                            <span className="text-muted-foreground flex-shrink-0 ml-2">
                              {formatCurrency(Number(item.total))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observations */}
                  {record.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Observações</p>
                      <p className="text-xs text-muted-foreground flex gap-1">
                        <StickyNote className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        {record.notes}
                      </p>
                    </div>
                  )}

                  {/* Footer info */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground border-t pt-2">
                    {record.mileage && (
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3 w-3" />{record.mileage.toLocaleString("pt-PT")} km
                      </span>
                    )}
                    {record.technician && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />{record.technician.name}
                      </span>
                    )}
                    {displayHours != null && (
                      <span>{displayHours}h registadas{quoteHours > 0 ? " (orçamento)" : ""}</span>
                    )}
                    {record.quote && (
                      <Link href={`/orcamentos/${record.quote.id}`} className="flex items-center gap-1 text-primary hover:underline ml-auto">
                        <FileText className="h-3 w-3" />{record.quote.number}
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
