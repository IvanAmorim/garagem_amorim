import { getQuotes } from "@/app/actions/quotes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Search, FileText } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate, getQuoteStatusLabel, decimalToNumber } from "@/lib/utils"
import type { Metadata } from "next"
import { QuoteActions } from "@/components/orcamentos/quote-actions"

export const metadata: Metadata = { title: "Orçamentos" }

const statusVariant = {
  DRAFT: "secondary" as const,
  SENT: "warning" as const,
  APPROVED: "success" as const,
  REJECTED: "destructive" as const,
  CONVERTED: "default" as const,
}

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const { search, status } = await searchParams
  const quotes = await getQuotes(search, status)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">{quotes.length} orçamentos</p>
        </div>
        <Button asChild>
          <Link href="/orcamentos/novo">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Orçamento</span>
          </Link>
        </Button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "ALL", label: "Todos" },
          { value: "DRAFT", label: "Rascunho" },
          { value: "SENT", label: "Enviado" },
          { value: "APPROVED", label: "Aprovado" },
          { value: "CONVERTED", label: "Convertido" },
        ].map((f) => (
          <Link key={f.value} href={`/orcamentos?status=${f.value}${search ? `&search=${search}` : ""}`}>
            <Badge
              variant={status === f.value || (!status && f.value === "ALL") ? "default" : "outline"}
              className="cursor-pointer"
            >
              {f.label}
            </Badge>
          </Link>
        ))}
      </div>

      <form className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="search"
          defaultValue={search}
          placeholder="Pesquisar por número, cliente ou matrícula..."
          className="pl-9"
        />
      </form>

      {quotes.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum orçamento encontrado</p>
          {!search && (
            <Button asChild className="mt-4">
              <Link href="/orcamentos/novo"><Plus className="h-4 w-4" />Novo Orçamento</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => (
            <Card key={q.id} className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link href={`/orcamentos/${q.id}`} className="font-bold hover:text-primary transition-colors">
                      {q.number}
                    </Link>
                    <Badge variant={statusVariant[q.status]}>
                      {getQuoteStatusLabel(q.status)}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{q.customer.name}</p>
                  {q.vehicle && (
                    <p className="text-xs text-muted-foreground">
                      {q.vehicle.brand} {q.vehicle.model} · {q.vehicle.plate}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-sm font-semibold">
                      {formatCurrency(decimalToNumber(q.total))}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(q.createdAt)}</span>
                  </div>
                </div>
                <QuoteActions quoteId={q.id} quoteNumber={q.number} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
