import { getStockItems } from "@/app/actions/stock"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Search, Package, AlertTriangle, PackageX } from "lucide-react"
import Link from "next/link"
import { formatCurrency, getStockStatusLabel, getStockUnitLabel, decimalToNumber } from "@/lib/utils"
import type { Metadata } from "next"
import { StockActions } from "@/components/stock/stock-actions"

export const metadata: Metadata = { title: "Stock" }

const statusVariant = {
  AVAILABLE: "success" as const,
  LOW: "warning" as const,
  OUT_OF_STOCK: "destructive" as const,
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const { search, status } = await searchParams
  const allItems = await getStockItems(search)

  const items = status && status !== "ALL"
    ? allItems.filter((i) => i.status === status)
    : allItems

  const lowCount = allItems.filter((i) => i.status === "LOW").length
  const outCount = allItems.filter((i) => i.status === "OUT_OF_STOCK").length

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Stock</h1>
          <p className="text-sm text-muted-foreground">{allItems.length} itens</p>
        </div>
        <Button asChild>
          <Link href="/stock/novo">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Item</span>
          </Link>
        </Button>
      </div>

      {/* Alerts */}
      {(lowCount > 0 || outCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {lowCount > 0 && (
            <Link href="/stock?status=LOW">
              <Badge variant="warning" className="gap-1 cursor-pointer">
                <AlertTriangle className="h-3 w-3" />
                {lowCount} com stock baixo
              </Badge>
            </Link>
          )}
          {outCount > 0 && (
            <Link href="/stock?status=OUT_OF_STOCK">
              <Badge variant="destructive" className="gap-1 cursor-pointer">
                <PackageX className="h-3 w-3" />
                {outCount} esgotado{outCount !== 1 ? "s" : ""}
              </Badge>
            </Link>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "ALL", label: "Todos" },
          { value: "AVAILABLE", label: "Disponível" },
          { value: "LOW", label: "Stock Baixo" },
          { value: "OUT_OF_STOCK", label: "Esgotado" },
        ].map((f) => (
          <Link key={f.value} href={`/stock?status=${f.value}${search ? `&search=${search}` : ""}`}>
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
          placeholder="Pesquisar por nome, referência, categoria..."
          className="pl-9"
        />
      </form>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum item encontrado</p>
          {!search && (
            <Button asChild className="mt-4">
              <Link href="/stock/novo"><Plus className="h-4 w-4" />Novo Item</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium">{item.name}</span>
                    <Badge variant={statusVariant[item.status]}>
                      {getStockStatusLabel(item.status)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {item.internalRef && <span>Ref: {item.internalRef}</span>}
                    {item.category && <span>{item.category}</span>}
                    {item.brand && <span>{item.brand}</span>}
                    {item.supplier && <span>{item.supplier}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-sm font-semibold ${item.status === "OUT_OF_STOCK" ? "text-destructive" : item.status === "LOW" ? "text-warning" : "text-foreground"}`}>
                      {decimalToNumber(item.quantity)} {getStockUnitLabel(item.unit)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Mín: {decimalToNumber(item.minQuantity)} {getStockUnitLabel(item.unit)}
                    </span>
                    {item.salePrice && (
                      <span className="text-xs font-medium text-foreground">
                        {formatCurrency(decimalToNumber(item.salePrice))}
                      </span>
                    )}
                  </div>
                </div>
                <StockActions stockItemId={item.id} stockItemName={item.name} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
