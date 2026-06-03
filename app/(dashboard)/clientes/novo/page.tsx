import { CustomerForm } from "@/components/clientes/customer-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Novo Cliente" }

export default function NovoClientePage() {
  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Novo Cliente</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do cliente</p>
        </div>
      </div>
      <CustomerForm />
    </div>
  )
}
