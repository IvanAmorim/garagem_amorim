import { VehicleForm } from "@/components/veiculos/vehicle-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Novo Veículo" }

export default async function NovoVeiculoPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { customerId } = await searchParams

  const customers = await db.customer.findMany({
    select: { id: true, name: true },
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  })

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/veiculos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Novo Veículo</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do veículo</p>
        </div>
      </div>
      <VehicleForm customers={customers} defaultCustomerId={customerId} />
    </div>
  )
}
