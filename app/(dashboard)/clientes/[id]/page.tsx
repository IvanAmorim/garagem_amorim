import { getCustomer } from "@/app/actions/customers"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Edit, Plus, Car, FileText, Wrench, Phone, Mail, MapPin, Hash } from "lucide-react"
import Link from "next/link"
import { formatDate, getQuoteStatusLabel } from "@/lib/utils"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Ficha do Cliente" }

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/clientes"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-primary">{customer.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{customer.name}</h1>
                <Badge variant={customer.status === "ACTIVE" ? "success" : "secondary"}>
                  {customer.status === "ACTIVE" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Cliente desde {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={`/clientes/${id}/editar`}>
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">Editar</span>
          </Link>
        </Button>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {customer.phone && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{customer.phone}</span>
            </div>
          </Card>
        )}
        {customer.email && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          </Card>
        )}
        {customer.nif && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>NIF: {customer.nif}</span>
            </div>
          </Card>
        )}
        {customer.address && (
          <Card className="p-4 sm:col-span-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{customer.address}</span>
            </div>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="vehicles">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="vehicles" className="flex-1 sm:flex-none">
            <Car className="h-4 w-4 mr-1.5" />
            Veículos ({customer.vehicles.length})
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex-1 sm:flex-none">
            <FileText className="h-4 w-4 mr-1.5" />
            Orçamentos ({customer.quotes.length})
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex-1 sm:flex-none">
            <Wrench className="h-4 w-4 mr-1.5" />
            Manutenções ({customer.maintenanceRecords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="mt-3">
          <div className="flex justify-end mb-3">
            <Button size="sm" asChild>
              <Link href={`/veiculos/novo?customerId=${id}`}>
                <Plus className="h-4 w-4" />
                Adicionar Veículo
              </Link>
            </Button>
          </div>
          {customer.vehicles.length === 0 ? (
            <Card className="p-8 text-center">
              <Car className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sem veículos registados</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {customer.vehicles.map((v) => (
                <Link key={v.id} href={`/veiculos/${v.id}`}>
                  <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{v.plate}</p>
                        <p className="text-sm text-muted-foreground">{v.brand} {v.model} {v.year ? `(${v.year})` : ""}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{v._count.maintenanceRecords} serviços</p>
                        <p>{v._count.quotes} orçamentos</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quotes" className="mt-3">
          {customer.quotes.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sem orçamentos</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {customer.quotes.map((q) => (
                <Link key={q.id} href={`/orcamentos/${q.id}`}>
                  <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{q.number}</p>
                        {q.vehicle && (
                          <p className="text-sm text-muted-foreground">{q.vehicle.plate}</p>
                        )}
                      </div>
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

        <TabsContent value="maintenance" className="mt-3">
          {customer.maintenanceRecords.length === 0 ? (
            <Card className="p-8 text-center">
              <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sem manutenções registadas</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {customer.maintenanceRecords.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{m.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.vehicle.brand} {m.vehicle.model} · {m.vehicle.plate}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(m.date)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
