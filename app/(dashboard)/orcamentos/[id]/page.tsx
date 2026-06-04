import { getQuote } from "@/app/actions/quotes"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Edit, Download, Scan } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate, getQuoteStatusLabel, decimalToNumber } from "@/lib/utils"
import type { Metadata } from "next"
import { QuoteItemsManager } from "@/components/orcamentos/quote-items-manager"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Orçamento" }

const statusVariant = {
  DRAFT: "secondary" as const,
  IN_PROGRESS: "warning" as const,
  COMPLETED: "success" as const,
  PAID: "default" as const,
}

export default async function OrcamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const [quote, stockItems] = await Promise.all([
    getQuote(id),
    db.stockItem.findMany({
      select: { id: true, name: true, internalRef: true, salePrice: true, unit: true, quantity: true },
      where: { status: { not: "OUT_OF_STOCK" } },
      orderBy: { name: "asc" },
    }),
  ])

  if (!quote) notFound()

  const laborTotal = quote.laborItems.reduce((acc, i) => acc + decimalToNumber(i.total), 0)
  const itemsSubtotal = quote.items.reduce((acc, i) => acc + decimalToNumber(i.quantity) * decimalToNumber(i.unitPrice), 0)
  const itemsTax = quote.items.reduce((acc, i) => acc + decimalToNumber(i.quantity) * decimalToNumber(i.unitPrice) * (decimalToNumber(i.taxRate) / 100), 0)
  const discount = decimalToNumber(quote.discount)
  const total = decimalToNumber(quote.total)

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/orcamentos"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{quote.number}</h1>
              <Badge variant={statusVariant[quote.status]}>{getQuoteStatusLabel(quote.status)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{formatDate(quote.createdAt)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={`/api/pdf/quote/${id}`} target="_blank">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href={`/orcamentos/${id}/editar`}>
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Customer & Vehicle info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Cliente</p>
          <Link href={`/clientes/${quote.customer.id}`} className="font-medium hover:text-primary">
            {quote.customer.name}
          </Link>
          {quote.customer.phone && <p className="text-sm text-muted-foreground">{quote.customer.phone}</p>}
          {quote.customer.nif && <p className="text-sm text-muted-foreground">NIF: {quote.customer.nif}</p>}
        </Card>
        {quote.vehicle && (
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Veículo</p>
            <Link href={`/veiculos/${quote.vehicle.id}`} className="font-medium hover:text-primary">
              {quote.vehicle.plate}
            </Link>
            <p className="text-sm text-muted-foreground">
              {quote.vehicle.brand} {quote.vehicle.model}
            </p>
          </Card>
        )}
      </div>

      {/* Items manager (client component) */}
      <QuoteItemsManager
        quoteId={id}
        items={quote.items.map((i) => ({
          id: i.id,
          description: i.description,
          reference: i.reference,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discountPct: Number(i.discountPct ?? 0),
          taxRate: Number(i.taxRate),
          total: Number(i.total),
          stockItem: i.stockItem,
          customerDiscountApplied: i.customerDiscountApplied,
          purchaseUnitPrice: i.purchaseUnitPrice != null ? Number(i.purchaseUnitPrice) : null,
          supplierInvoiceRef: i.supplierInvoiceRef,
        }))}
        laborItems={quote.laborItems.map((i) => ({
          id: i.id,
          description: i.description,
          hours: decimalToNumber(i.hours),
          hourRate: decimalToNumber(i.hourRate),
          total: decimalToNumber(i.total),
        }))}
        stockItems={stockItems.map((s) => ({
          id: s.id,
          name: s.name,
          internalRef: s.internalRef,
          salePrice: s.salePrice === null ? null : decimalToNumber(s.salePrice),
          discountPrice: null,
          unit: s.unit,
          quantity: decimalToNumber(s.quantity),
        }))}
        defaultLaborRate={decimalToNumber(quote.laborHourRate ?? 50)}
        defaultTaxRate={decimalToNumber(quote.taxRate)}
        quoteNumber={quote.number}
      />

      {/* Totals */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal materiais</span>
              <span>{formatCurrency(itemsSubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mão de obra</span>
              <span>{formatCurrency(laborTotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Desconto</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA</span>
              <span>{formatCurrency(itemsTax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-lg">{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OCR section */}
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Adicionar Materiais por Fotografia</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tire foto a uma fatura de material e extraia os artigos automaticamente
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/pecas-por-atribuir?quoteId=${id}`}>
                <Scan className="h-4 w-4" />
                Upload Fatura
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {(quote.notes || quote.terms) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quote.notes && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
            </Card>
          )}
          {quote.terms && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Condições Comerciais</p>
              <p className="text-sm whitespace-pre-wrap">{quote.terms}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
