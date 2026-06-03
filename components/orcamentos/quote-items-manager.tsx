"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Wrench, Package, AlertTriangle, Tag, Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { addQuoteItem, removeQuoteItem, addLaborItem, removeLaborItem } from "@/app/actions/quotes"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { useRouter as useNextRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"

interface QuoteItem {
  id: string
  description: string
  reference: string | null | undefined
  quantity: number
  unitPrice: number
  discountPct: number
  taxRate: number
  total: number
  stockItem: { id: string; name: string; unit: string } | null
}

interface LaborItem {
  id: string
  description: string
  hours: number
  hourRate: number
  total: number
}

interface StockItem {
  id: string
  name: string
  internalRef: string | null | undefined
  salePrice: number | null
  discountPrice?: number | null
  unit: string
  quantity: number
}

interface QuoteItemsManagerProps {
  quoteId: string
  items: QuoteItem[]
  laborItems: LaborItem[]
  stockItems: StockItem[]
  defaultLaborRate: number
  defaultTaxRate: number
  quoteNumber: string
  customerDiscountRate?: number | null
}

export function QuoteItemsManager({
  quoteId,
  items,
  laborItems,
  stockItems,
  defaultLaborRate,
  defaultTaxRate,
  customerDiscountRate,
}: QuoteItemsManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddLabor, setShowAddLabor] = useState(false)
  const [selectedStockId, setSelectedStockId] = useState("")

  const [newItem, setNewItem] = useState({
    description: "",
    reference: "",
    quantity: "1",
    unitPrice: "",
    discountPct: "0",
    taxRate: String(defaultTaxRate),
    applyItemDiscount: false,
    applyCustomerDiscount: false,
  })

  const [newLabor, setNewLabor] = useState({
    description: "Mão de obra",
    hours: "1",
    hourRate: String(defaultLaborRate),
  })

  const selectedStock = stockItems.find((s) => s.id === selectedStockId)
  const hasItemDiscount = selectedStock?.discountPrice != null && selectedStock.salePrice != null
    && selectedStock.discountPrice < selectedStock.salePrice
  const hasCustomerDiscount = customerDiscountRate != null && Number(customerDiscountRate) > 0

  const computedDiscountPct = () => {
    if (newItem.applyItemDiscount && hasItemDiscount && selectedStock?.salePrice && selectedStock?.discountPrice) {
      const pct = ((selectedStock.salePrice - selectedStock.discountPrice) / selectedStock.salePrice) * 100
      return Math.round(pct * 100) / 100
    }
    if (newItem.applyCustomerDiscount && hasCustomerDiscount) {
      return Number(customerDiscountRate)
    }
    return Number(newItem.discountPct) || 0
  }

  const handleStockSelect = (stockId: string) => {
    const stock = stockItems.find((s) => s.id === stockId)
    if (stock) {
      setNewItem((prev) => ({
        ...prev,
        description: stock.name,
        reference: stock.internalRef ?? "",
        quantity: "1",
        unitPrice: stock.salePrice ? String(stock.salePrice) : "",
        discountPct: "0",
        applyItemDiscount: false,
        applyCustomerDiscount: false,
      }))
      setSelectedStockId(stockId)
    }
  }

  const handleAddItem = () => {
    if (!newItem.description || !newItem.quantity || !newItem.unitPrice) return

    // Check stock
    if (selectedStockId && selectedStock) {
      if (selectedStock.quantity < parseFloat(newItem.quantity)) {
        toast({
          title: "Stock insuficiente",
          description: `Disponível: ${selectedStock.quantity} ${selectedStock.unit}`,
          variant: "destructive",
        })
        return
      }
    }

    const discountPct = computedDiscountPct()

    startTransition(async () => {
      const result = await addQuoteItem(quoteId, {
        description: newItem.description,
        reference: newItem.reference || undefined,
        quantity: parseFloat(newItem.quantity),
        unitPrice: parseFloat(newItem.unitPrice),
        taxRate: parseFloat(newItem.taxRate),
        discountPct,
        stockItemId: selectedStockId || undefined,
      })
      if (result.success) {
        toast({
          title: "Material adicionado",
          description: selectedStockId ? "Stock atualizado automaticamente" : undefined,
        })
        setShowAddItem(false)
        setNewItem({
          description: "",
          reference: "",
          quantity: "1",
          unitPrice: "",
          discountPct: "0",
          taxRate: String(defaultTaxRate),
          applyItemDiscount: false,
          applyCustomerDiscount: false,
        })
        setSelectedStockId("")
        router.refresh()
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleAddLabor = () => {
    if (!newLabor.description || !newLabor.hours || !newLabor.hourRate) return
    startTransition(async () => {
      const result = await addLaborItem(quoteId, {
        description: newLabor.description,
        hours: parseFloat(newLabor.hours),
        hourRate: parseFloat(newLabor.hourRate),
      })
      if (result.success) {
        toast({ title: "Mão de obra adicionada" })
        setShowAddLabor(false)
        setNewLabor({ description: "Mão de obra", hours: "1", hourRate: String(defaultLaborRate) })
        router.refresh()
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleRemoveItem = (itemId: string) => {
    startTransition(async () => {
      const result = await removeQuoteItem(itemId, quoteId)
      if (result.success) {
        router.refresh()
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleRemoveLabor = (itemId: string) => {
    startTransition(async () => {
      await removeLaborItem(itemId, quoteId)
      router.refresh()
    })
  }

  const getEffectivePrice = () => {
    const price = parseFloat(newItem.unitPrice || "0")
    const qty = parseFloat(newItem.quantity || "0")
    const disc = computedDiscountPct()
    const tax = parseFloat(newItem.taxRate || "0")
    const priceAfterDiscount = price * (1 - disc / 100)
    return qty * priceAfterDiscount * (1 + tax / 100)
  }

  return (
    <>
      {/* Materials */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Materiais ({items.length})
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddItem(true)}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sem materiais adicionados
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{item.description}</p>
                      {item.discountPct > 0 && (
                        <Badge variant="warning" className="text-xs gap-0.5">
                          <Percent className="h-2.5 w-2.5" />
                          {item.discountPct}% desc.
                        </Badge>
                      )}
                    </div>
                    {item.reference && <p className="text-xs text-muted-foreground">{item.reference}</p>}
                    <div className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                      {item.discountPct > 0 && (
                        <span className="text-warning ml-1">
                          (-{item.discountPct}% → {formatCurrency(item.unitPrice * (1 - item.discountPct / 100))})
                        </span>
                      )}
                      {" "}+ IVA {item.taxRate}%
                    </div>
                    {item.stockItem && (
                      <p className="text-xs text-primary mt-0.5">
                        Stock: {item.stockItem.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold">{formatCurrency(item.total)}</p>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive mt-0.5"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Mão de Obra ({laborItems.length})
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddLabor(true)}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {laborItems.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sem mão de obra adicionada
            </div>
          ) : (
            <div className="divide-y">
              {laborItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.hours}h × {formatCurrency(item.hourRate)}/h
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold">{formatCurrency(item.total)}</p>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive mt-0.5"
                      onClick={() => handleRemoveLabor(item.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Adicionar Material</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Stock selector */}
            <div className="space-y-2">
              <Label>Do Stock (opcional)</Label>
              <Select onValueChange={handleStockSelect} value={selectedStockId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pesquisar no stock..." />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span>{s.name} {s.internalRef ? `(${s.internalRef})` : ""}</span>
                        <span className={`text-xs ${s.quantity <= 0 ? "text-destructive" : s.quantity <= 5 ? "text-warning" : "text-success"}`}>
                          {s.quantity} {s.unit}
                        </span>
                        {s.discountPrice && s.salePrice && s.discountPrice < s.salePrice && (
                          <Badge variant="warning" className="text-xs">Desconto disponível</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock availability warning */}
            {selectedStock && selectedStock.quantity <= 0 && (
              <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                Stock esgotado. Confirme antes de adicionar.
              </div>
            )}
            {selectedStock && selectedStock.quantity > 0 && selectedStock.quantity < 5 && (
              <div className="flex items-center gap-2 p-2 bg-warning/10 text-warning rounded text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                Stock baixo: apenas {selectedStock.quantity} {selectedStock.unit} disponível.
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Referência</Label>
              <Input value={newItem.reference} onChange={(e) => setNewItem({ ...newItem, reference: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Qtd.</Label>
                <Input type="number" step="0.001" min="0.001" value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>P. Venda (€)</Label>
                <Input type="number" step="0.01" min="0" value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>IVA (%)</Label>
                <Input type="number" step="0.1" min="0" value={newItem.taxRate}
                  onChange={(e) => setNewItem({ ...newItem, taxRate: e.target.value })} />
              </div>
            </div>

            {/* Discount options */}
            {(hasItemDiscount || hasCustomerDiscount) && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-warning" />
                  Descontos Disponíveis
                </p>

                {hasItemDiscount && selectedStock?.salePrice && selectedStock?.discountPrice && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Desconto da peça</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(selectedStock.salePrice)} →{" "}
                        <span className="text-success font-medium">{formatCurrency(selectedStock.discountPrice)}</span>
                        {" "}(
                        {(((selectedStock.salePrice - selectedStock.discountPrice) / selectedStock.salePrice) * 100).toFixed(1)}% off
                        )
                      </p>
                    </div>
                    <Switch
                      checked={newItem.applyItemDiscount}
                      onCheckedChange={(checked) => setNewItem({
                        ...newItem,
                        applyItemDiscount: checked,
                        applyCustomerDiscount: checked ? false : newItem.applyCustomerDiscount,
                        unitPrice: checked && selectedStock.discountPrice
                          ? String(selectedStock.discountPrice)
                          : selectedStock.salePrice ? String(selectedStock.salePrice) : newItem.unitPrice
                      })}
                    />
                  </div>
                )}

                {hasCustomerDiscount && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Desconto do cliente</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(customerDiscountRate)}% de desconto habitual
                      </p>
                    </div>
                    <Switch
                      checked={newItem.applyCustomerDiscount}
                      onCheckedChange={(checked) => setNewItem({
                        ...newItem,
                        applyCustomerDiscount: checked,
                        applyItemDiscount: checked ? false : newItem.applyItemDiscount,
                      })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Manual discount */}
            {!newItem.applyItemDiscount && !newItem.applyCustomerDiscount && (
              <div className="space-y-2">
                <Label>Desconto Manual (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={newItem.discountPct}
                  onChange={(e) => setNewItem({ ...newItem, discountPct: e.target.value })}
                  placeholder="0"
                />
              </div>
            )}

            {/* Total preview */}
            {newItem.quantity && newItem.unitPrice && (
              <div className="p-2 bg-muted rounded text-sm space-y-1">
                {computedDiscountPct() > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Preço original: {formatCurrency(parseFloat(newItem.quantity) * parseFloat(newItem.unitPrice))}</span>
                    <span className="text-warning">-{computedDiscountPct().toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Total com IVA:</span>
                  <span>{formatCurrency(getEffectivePrice())}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancelar</Button>
            <Button
              onClick={handleAddItem}
              disabled={isPending || !newItem.description || !newItem.unitPrice}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Labor Dialog */}
      <Dialog open={showAddLabor} onOpenChange={setShowAddLabor}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Mão de Obra</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={newLabor.description} onChange={(e) => setNewLabor({ ...newLabor, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Horas *</Label>
                <Input type="number" step="0.5" min="0.5" value={newLabor.hours}
                  onChange={(e) => setNewLabor({ ...newLabor, hours: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor/Hora (€)</Label>
                <Input type="number" step="0.01" min="0" value={newLabor.hourRate}
                  onChange={(e) => setNewLabor({ ...newLabor, hourRate: e.target.value })} />
              </div>
            </div>
            {newLabor.hours && newLabor.hourRate && (
              <p className="text-sm text-muted-foreground">
                Total: {formatCurrency(parseFloat(newLabor.hours) * parseFloat(newLabor.hourRate))}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLabor(false)}>Cancelar</Button>
            <Button onClick={handleAddLabor} disabled={isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
