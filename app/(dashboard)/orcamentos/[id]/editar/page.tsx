import { getQuote } from "@/app/actions/quotes"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { QuoteEditForm } from "@/components/orcamentos/quote-edit-form"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Editar Orçamento" }

export default async function EditarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const [quote, customers, vehicles] = await Promise.all([
    getQuote(id),
    db.customer.findMany({ select: { id: true, name: true }, where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.vehicle.findMany({ select: { id: true, plate: true, brand: true, model: true, customerId: true }, orderBy: { plate: "asc" } }),
  ])

  if (!quote) notFound()

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/orcamentos/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Editar Orçamento</h1>
          <p className="text-sm text-muted-foreground">{quote.number}</p>
        </div>
      </div>
      <QuoteEditForm quote={quote} customers={customers} vehicles={vehicles} />
    </div>
  )
}
