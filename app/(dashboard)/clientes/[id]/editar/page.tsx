import { getCustomer } from "@/app/actions/customers"
import { CustomerForm } from "@/components/clientes/customer-form"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Editar Cliente" }

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/clientes/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Editar Cliente</h1>
          <p className="text-sm text-muted-foreground">{customer.name}</p>
        </div>
      </div>
      <CustomerForm customer={{
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        nif: customer.nif,
        address: customer.address,
        notes: customer.notes,
        status: customer.status,
      }} />
    </div>
  )
}
