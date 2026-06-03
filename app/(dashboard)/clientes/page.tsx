import { getCustomers } from "@/app/actions/customers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Search, Users, Car, Phone, Mail } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import type { Metadata } from "next"
import { CustomerActions } from "@/components/clientes/customer-actions"

export const metadata: Metadata = { title: "Clientes" }

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const { search } = await searchParams
  const customers = await getCustomers(search)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{customers.length} clientes</p>
        </div>
        <Button asChild>
          <Link href="/clientes/novo">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Cliente</span>
          </Link>
        </Button>
      </div>

      {/* Search */}
      <form className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="search"
          defaultValue={search}
          placeholder="Pesquisar por nome, telefone, email, NIF ou matrícula..."
          className="pl-9"
        />
      </form>

      {/* Customer list */}
      {customers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum cliente encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Tente alterar a pesquisa" : "Crie o primeiro cliente"}
          </p>
          {!search && (
            <Button asChild className="mt-4">
              <Link href="/clientes/novo">
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <Card key={customer.id} className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/clientes/${customer.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {customer.name}
                      </Link>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {customer.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant={customer.status === "ACTIVE" ? "success" : "secondary"}
                          className="text-[10px] py-0"
                        >
                          {customer.status === "ACTIVE" ? "Ativo" : "Inativo"}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Car className="h-3 w-3" />
                          {customer.vehicles.length} veículo{customer.vehicles.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {customer._count.quotes} orçamento{customer._count.quotes !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {formatDate(customer.createdAt)}
                      </span>
                      <CustomerActions customerId={customer.id} customerName={customer.name} />
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
