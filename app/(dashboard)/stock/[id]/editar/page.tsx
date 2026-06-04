import { getStockItem } from "@/app/actions/stock"
import { StockForm } from "@/components/stock/stock-form"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Editar Item de Stock" }

export default async function EditarStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getStockItem(id)
  if (!item) notFound()

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/stock"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Editar Item</h1>
          <p className="text-sm text-muted-foreground">{item.name}</p>
        </div>
      </div>
      <StockForm item={{
        id: item.id,
        name: item.name,
        internalRef: item.internalRef,
        supplierRef: item.supplierRef,
        category: item.category,
        brand: item.brand,
        quantity: Number(item.quantity),
        minQuantity: Number(item.minQuantity),
        unit: item.unit,
        costPrice: item.costPrice != null ? Number(item.costPrice) : null,
        salePrice: item.salePrice != null ? Number(item.salePrice) : null,
        supplier: item.supplier,
        location: item.location,
      }} />
    </div>
  )
}
