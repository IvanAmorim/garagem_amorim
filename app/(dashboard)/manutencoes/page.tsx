import { getMaintenanceRecords } from "@/app/actions/maintenance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Search, Wrench, Gauge, Calendar, User } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import type { Metadata } from "next"

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
        <div className="space-y-2">
          {records.map((record) => (
            <Card key={record.id} className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                  <Wrench className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{record.customer.name}</p>
                      <Link href={`/veiculos/${record.vehicle.id}`} className="text-xs text-primary hover:underline">
                        {record.vehicle.plate} · {record.vehicle.brand} {record.vehicle.model}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{record.description}</p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-1">
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
                        {record.laborHours && <span>{Number(record.laborHours)}h</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(record.date)}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
