import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { QuoteForm } from "@/components/orcamentos/quote-form"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Novo Orçamento" }

export default async function NovoOrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string; customerId?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { vehicleId, customerId } = await searchParams

  const [customers, vehicles, settings] = await Promise.all([
    db.customer.findMany({ select: { id: true, name: true }, where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.vehicle.findMany({ select: { id: true, plate: true, brand: true, model: true, customerId: true }, orderBy: { plate: "asc" } }),
    db.workshopSettings.findFirst(),
  ])

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/orcamentos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Novo Orçamento</h1>
          <p className="text-sm text-muted-foreground">Criar orçamento de serviço</p>
        </div>
      </div>
      <QuoteForm
        customers={customers}
        vehicles={vehicles}
        defaultCustomerId={customerId}
        defaultVehicleId={vehicleId}
        defaultLaborRate={settings ? Number(settings.laborHourRate) : 50}
        defaultTaxRate={settings ? Number(settings.defaultTaxRate) : 23}
      />
    </div>
  )
}
