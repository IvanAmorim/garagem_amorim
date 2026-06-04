"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Wrench, Package, AlertTriangle, Tag, Percent, Pencil } from "lucide-react"
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
import { addQuoteItem, updateQuoteItem, removeQuoteItem, addLaborItem, updateLaborItem, removeLaborItem } from "@/app/actions/quotes"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

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
  customerDiscountApplied?: boolean
  purchaseUnitPrice?: number | null
  supplierInvoiceRef?: string | null
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

type PricingMode = "discount" | "margin"

function blankItem(defaultTaxRate: number) {
  return {
    description: "",
    reference: "",
    quantity: "1",
    unitPrice: "",
    costPrice: "",
    discountPct: "0",
    marginPct: "0",
    taxRate: String(defaultTaxRate),
    pricingMode: "discount" as PricingMode,
    applyItemDiscount: false,
    applyCustomerDiscount: false,
  }
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
  const [editItem, setEditItem] = useState<QuoteItem | null>(null)
  const [editLabor, setEditLabor] = useState<LaborItem | null>(null)
  const [selectedStockId, setSelectedStockId] = useState("")

  const [newItem, setNewItem] = useState(blankItem(defaultTaxRate))
  const [editItemForm, setEditItemForm] = useState({
    description: "",
    reference: "",
    quantity: "1",
    unitPrice: "",
    costPrice: "",
    discountPct: "0",
    marginPct: "0",
    taxRate: String(defaultTaxRate),
    pricingMode: "discount" as PricingMode,
  })

  const [newLabor, setNewLabor] = useState({
    description: "Mão de obra",
    hours: "1",
    hourRate: String(defaultLaborRate),
  })
  const [editLaborForm, setEditLaborForm] = useState({
    description: "",
    hours: "1",
    hourRate: String(defaultLaborRate),
  })

  const selectedStock = stockItems.find((s) => s.id === selectedStockId)
  const hasItemDiscount = selectedStock?.discountPrice != null && selectedStock.salePrice != null
    && selectedStock.discountPrice < selectedStock.salePrice
  const hasCustomerDiscount = customerDiscountRate != null && Number(customerDiscountRate) > 0

  // --- pricing helpers ---
  function computeDiscountPct(form: typeof newItem | typeof editItemForm): number {
    if ("applyItemDiscount" in form && form.applyItemDiscount && hasItemDiscount && selectedStock?.salePrice && selectedStock?.discountPrice) {
      return Math.round(((selectedStock.salePrice - selectedStock.discountPrice) / selectedStock.salePrice) * 10000) / 100
    }
    if ("applyCustomerDiscount" in form && form.applyCustomerDiscount && hasCustomerDiscount) {
      return Number(customerDiscountRate)
    }
    if (form.pricingMode === "margin") {
      // margin → derive discount from cost and margin
      const cost = parseFloat(form.costPrice || "0")
      const margin = parseFloat(form.marginPct || "0")
      if (cost > 0 && margin >= 0 && margin < 100) {
        const salePrice = cost / (1 - margin / 100)
        const price = parseFloat(form.unitPrice || "0")
        if (price > 0) return Math.max(0, Math.round((1 - salePrice / price) * 10000) / 100)
      }
      return 0
    }
    return Number(form.discountPct) || 0
  }

  function computeUnitPriceFromMargin(cost: number, margin: number): number {
    if (cost <= 0 || margin >= 100) return 0
    return cost / (1 - margin / 100)
  }

  function computeMarginFromCostAndPrice(cost: number, price: number): number {
    if (price <= 0) return 0
    return Math.round((1 - cost / price) * 10000) / 100
  }

  function computeTotal(form: typeof newItem | typeof editItemForm): number {
    const price = parseFloat(form.unitPrice || "0")
    const qty = parseFloat(form.quantity || "0")
    const disc = computeDiscountPct(form)
    const tax = parseFloat(form.taxRate || "0")
    return qty * price * (1 - disc / 100) * (1 + tax / 100)
  }

  // --- add item ---
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
    if (selectedStockId && selectedStock && selectedStock.quantity < parseFloat(newItem.quantity)) {
      toast({ title: "Stock insuficiente", description: `Disponível: ${selectedStock.quantity} ${selectedStock.unit}`, variant: "destructive" })
      return
    }
    const discountPct = computeDiscountPct(newItem)
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
        toast({ title: "Material adicionado" })
        setShowAddItem(false)
        setNewItem(blankItem(defaultTaxRate))
        setSelectedStockId("")
        router.refresh()
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  // --- edit item ---
  const openEditItem = (item: QuoteItem) => {
    setEditItem(item)
    setEditItemForm({
      description: item.description,
      reference: item.reference ?? "",
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      costPrice: item.purchaseUnitPrice ? String(item.purchaseUnitPrice) : "",
      discountPct: String(item.discountPct),
      marginPct: item.purchaseUnitPrice && item.unitPrice > 0
        ? String(computeMarginFromCostAndPrice(item.purchaseUnitPrice, item.unitPrice))
        : "0",
      taxRate: String(item.taxRate),
      pricingMode: "discount",
    })
  }

  const handleEditItem = () => {
    if (!editItem) return
    const discountPct = computeDiscountPct(editItemForm)
    startTransition(async () => {
      const result = await updateQuoteItem(editItem.id, quoteId, {
        description: editItemForm.description,
        reference: editItemForm.reference || undefined,
        quantity: parseFloat(editItemForm.quantity),
        unitPrice: parseFloat(editItemForm.unitPrice),
        taxRate: parseFloat(editItemForm.taxRate),
        discountPct,
      })
      if (result.success) {
        toast({ title: "Material atualizado" })
        setEditItem(null)
        router.refresh()
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  // --- labor ---
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

  const openEditLabor = (item: LaborItem) => {
    setEditLabor(item)
    setEditLaborForm({ description: item.description, hours: String(item.hours), hourRate: String(item.hourRate) })
  }

  const handleEditLabor = () => {
    if (!editLabor) return
    startTransition(async () => {
      const result = await updateLaborItem(editLabor.id, quoteId, {
        description: editLaborForm.description,
        hours: parseFloat(editLaborForm.hours),
        hourRate: parseFloat(editLaborForm.hourRate),
      })
      if (result.success) {
        toast({ title: "Mão de obra atualizada" })
        setEditLabor(null)
        router.refresh()
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleRemoveItem = (itemId: string) => {
    startTransition(async () => {
      const result = await removeQuoteItem(itemId, quoteId)
      if (result.success) { router.refresh() }
      else toast({ title: "Erro", description: result.error, variant: "destructive" })
    })
  }

  const handleRemoveLabor = (itemId: string) => {
    startTransition(async () => {
      await removeLaborItem(itemId, quoteId)
      router.refresh()
    })
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
              <Plus className="h-4 w-4" />Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem materiais adicionados</div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{item.description}</p>
                      {item.discountPct > 0 && item.customerDiscountApplied && (
                        <Badge variant="warning" className="text-xs gap-0.5">
                          <Percent className="h-2.5 w-2.5" />Desc. fornecedor {item.discountPct}%
                        </Badge>
                      )}
                      {item.discountPct > 0 && !item.customerDiscountApplied && (
                        <Badge variant="warning" className="text-xs gap-0.5">
                          <Percent className="h-2.5 w-2.5" />{item.discountPct}% desc.
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
                      <p className="text-xs text-primary mt-0.5">Stock: {item.stockItem.name}</p>
                    )}
                    {item.supplierInvoiceRef && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Tag className="h-3 w-3 flex-shrink-0" />{item.supplierInvoiceRef}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
                    <p className="text-sm font-semibold">{formatCurrency(item.total)}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditItem(item)} disabled={isPending}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleRemoveItem(item.id)} disabled={isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
              <Plus className="h-4 w-4" />Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {laborItems.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem mão de obra adicionada</div>
          ) : (
            <div className="divide-y">
              {laborItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.hours}h × {formatCurrency(item.hourRate)}/h</p>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
                    <p className="text-sm font-semibold">{formatCurrency(item.total)}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditLabor(item)} disabled={isPending}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => handleRemoveLabor(item.id)} disabled={isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Item Dialog ── */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Adicionar Material</DialogTitle></DialogHeader>
          <ItemForm
            form={newItem}
            setForm={setNewItem as never}
            stockItems={stockItems}
            selectedStockId={selectedStockId}
            onStockSelect={handleStockSelect}
            hasItemDiscount={hasItemDiscount}
            hasCustomerDiscount={hasCustomerDiscount}
            customerDiscountRate={customerDiscountRate}
            selectedStock={selectedStock}
            computeDiscountPct={computeDiscountPct}
            computeTotal={computeTotal}
            computeUnitPriceFromMargin={computeUnitPriceFromMargin}
            computeMarginFromCostAndPrice={computeMarginFromCostAndPrice}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancelar</Button>
            <Button onClick={handleAddItem} disabled={isPending || !newItem.description || !newItem.unitPrice}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Item Dialog ── */}
      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Material</DialogTitle></DialogHeader>
          <ItemForm
            form={editItemForm}
            setForm={setEditItemForm as never}
            stockItems={[]}
            selectedStockId=""
            onStockSelect={() => {}}
            hasItemDiscount={false}
            hasCustomerDiscount={hasCustomerDiscount}
            customerDiscountRate={customerDiscountRate}
            selectedStock={undefined}
            computeDiscountPct={computeDiscountPct}
            computeTotal={computeTotal}
            computeUnitPriceFromMargin={computeUnitPriceFromMargin}
            computeMarginFromCostAndPrice={computeMarginFromCostAndPrice}
            hideStockSelector
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleEditItem} disabled={isPending || !editItemForm.description || !editItemForm.unitPrice}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Labor Dialog ── */}
      <Dialog open={showAddLabor} onOpenChange={setShowAddLabor}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Mão de Obra</DialogTitle></DialogHeader>
          <LaborForm form={newLabor} setForm={setNewLabor} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLabor(false)}>Cancelar</Button>
            <Button onClick={handleAddLabor} disabled={isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Labor Dialog ── */}
      <Dialog open={!!editLabor} onOpenChange={(o) => { if (!o) setEditLabor(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Mão de Obra</DialogTitle></DialogHeader>
          <LaborForm form={editLaborForm} setForm={setEditLaborForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLabor(null)}>Cancelar</Button>
            <Button onClick={handleEditLabor} disabled={isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ItemFormBase {
  description: string
  reference: string
  quantity: string
  unitPrice: string
  costPrice: string
  discountPct: string
  marginPct: string
  taxRate: string
  pricingMode: PricingMode
  applyItemDiscount?: boolean
  applyCustomerDiscount?: boolean
}

interface ItemFormProps {
  form: ItemFormBase
  setForm: (f: ItemFormBase) => void
  stockItems: StockItem[]
  selectedStockId: string
  onStockSelect: (id: string) => void
  hasItemDiscount: boolean
  hasCustomerDiscount: boolean
  customerDiscountRate?: number | null
  selectedStock?: StockItem
  computeDiscountPct: (f: ItemFormBase) => number
  computeTotal: (f: ItemFormBase) => number
  computeUnitPriceFromMargin: (cost: number, margin: number) => number
  computeMarginFromCostAndPrice: (cost: number, price: number) => number
  hideStockSelector?: boolean
}

function ItemForm({
  form, setForm,
  stockItems, selectedStockId, onStockSelect,
  hasItemDiscount, hasCustomerDiscount, customerDiscountRate, selectedStock,
  computeDiscountPct, computeTotal, computeUnitPriceFromMargin, computeMarginFromCostAndPrice,
  hideStockSelector,
}: ItemFormProps) {
  const discountPct = computeDiscountPct(form)
  const total = computeTotal(form)
  const isManualDiscount = !form.applyItemDiscount && !form.applyCustomerDiscount

  return (
    <div className="space-y-4">
      {/* Stock selector */}
      {!hideStockSelector && stockItems.length > 0 && (
        <div className="space-y-2">
          <Label>Do Stock (opcional)</Label>
          <Select onValueChange={onStockSelect} value={selectedStockId}>
            <SelectTrigger><SelectValue placeholder="Pesquisar no stock..." /></SelectTrigger>
            <SelectContent>
              {stockItems.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <span>{s.name} {s.internalRef ? `(${s.internalRef})` : ""}</span>
                    <span className={`text-xs ${s.quantity <= 0 ? "text-destructive" : s.quantity <= 5 ? "text-warning" : "text-success"}`}>
                      {s.quantity} {s.unit}
                    </span>
                    {s.discountPrice && s.salePrice && s.discountPrice < s.salePrice && (
                      <Badge variant="warning" className="text-xs">Desc.</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedStock && selectedStock.quantity <= 0 && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />Stock esgotado.
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Descrição *</Label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Referência</Label>
        <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Qtd.</Label>
          <Input type="number" step="0.001" min="0.001" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>IVA (%)</Label>
          <Input type="number" step="0.1" min="0" value={form.taxRate}
            onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
        </div>
      </div>

      {/* Pricing mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => setForm({ ...form, pricingMode: "discount" })}
          className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${form.pricingMode === "discount" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
        >
          Desconto
        </button>
        <button
          type="button"
          onClick={() => setForm({ ...form, pricingMode: "margin" })}
          className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${form.pricingMode === "margin" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
        >
          Margem de Lucro
        </button>
      </div>

      {form.pricingMode === "discount" && (
        <>
          <div className="space-y-2">
            <Label>P. Venda (€)</Label>
            <Input type="number" step="0.01" min="0" value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
          </div>

          {/* Available discounts */}
          {(hasItemDiscount || hasCustomerDiscount) && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-warning" />Descontos Disponíveis
              </p>
              {hasItemDiscount && selectedStock?.salePrice && selectedStock?.discountPrice && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Desconto da peça</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(selectedStock.salePrice)} → <span className="text-success font-medium">{formatCurrency(selectedStock.discountPrice)}</span>
                    </p>
                  </div>
                  <Switch
                    checked={form.applyItemDiscount ?? false}
                    onCheckedChange={(checked) => setForm({
                      ...form,
                      applyItemDiscount: checked,
                      applyCustomerDiscount: checked ? false : (form.applyCustomerDiscount ?? false),
                      unitPrice: checked && selectedStock.discountPrice
                        ? String(selectedStock.discountPrice)
                        : selectedStock.salePrice ? String(selectedStock.salePrice) : form.unitPrice,
                    })}
                  />
                </div>
              )}
              {hasCustomerDiscount && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Desconto do cliente</p>
                    <p className="text-xs text-muted-foreground">{Number(customerDiscountRate)}% habitual</p>
                  </div>
                  <Switch
                    checked={form.applyCustomerDiscount ?? false}
                    onCheckedChange={(checked) => setForm({
                      ...form,
                      applyCustomerDiscount: checked,
                      applyItemDiscount: checked ? false : (form.applyItemDiscount ?? false),
                    })}
                  />
                </div>
              )}
            </div>
          )}

          {isManualDiscount && (
            <div className="space-y-2">
              <Label>Desconto (%)</Label>
              <Input type="number" step="0.5" min="0" max="100" value={form.discountPct}
                onChange={(e) => setForm({ ...form, discountPct: e.target.value })} placeholder="0" />
            </div>
          )}
        </>
      )}

      {form.pricingMode === "margin" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>P. Custo (€)</Label>
              <Input
                type="number" step="0.01" min="0" value={form.costPrice}
                onChange={(e) => {
                  const cost = parseFloat(e.target.value || "0")
                  const margin = parseFloat(form.marginPct || "0")
                  const salePrice = cost > 0 && margin < 100 ? computeUnitPriceFromMargin(cost, margin) : 0
                  setForm({ ...form, costPrice: e.target.value, unitPrice: salePrice > 0 ? salePrice.toFixed(2) : form.unitPrice })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Margem (%)</Label>
              <Input
                type="number" step="0.5" min="0" max="99" value={form.marginPct}
                onChange={(e) => {
                  const margin = parseFloat(e.target.value || "0")
                  const cost = parseFloat(form.costPrice || "0")
                  const salePrice = cost > 0 && margin < 100 ? computeUnitPriceFromMargin(cost, margin) : 0
                  setForm({ ...form, marginPct: e.target.value, unitPrice: salePrice > 0 ? salePrice.toFixed(2) : form.unitPrice })
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>P. Venda calculado (€)</Label>
            <Input
              type="number" step="0.01" min="0" value={form.unitPrice}
              onChange={(e) => {
                const price = parseFloat(e.target.value || "0")
                const cost = parseFloat(form.costPrice || "0")
                const margin = cost > 0 && price > 0 ? computeMarginFromCostAndPrice(cost, price) : 0
                setForm({ ...form, unitPrice: e.target.value, marginPct: margin > 0 ? String(margin) : form.marginPct })
              }}
            />
          </div>
          {form.costPrice && form.unitPrice && parseFloat(form.costPrice) > 0 && parseFloat(form.unitPrice) > 0 && (
            <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground flex justify-between">
              <span>Custo: {formatCurrency(parseFloat(form.costPrice))}</span>
              <span>Margem: {computeMarginFromCostAndPrice(parseFloat(form.costPrice), parseFloat(form.unitPrice)).toFixed(1)}%</span>
              <span className="text-success font-medium">Lucro: {formatCurrency(parseFloat(form.unitPrice) - parseFloat(form.costPrice))}</span>
            </div>
          )}
        </div>
      )}

      {/* Total preview */}
      {form.quantity && form.unitPrice && (
        <div className="p-2 bg-muted rounded text-sm space-y-1">
          {discountPct > 0 && (
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Original: {formatCurrency(parseFloat(form.quantity) * parseFloat(form.unitPrice))}</span>
              <span className="text-warning">-{discountPct.toFixed(1)}%</span>
            </div>
          )}
          <div className="flex justify-between font-medium">
            <span>Total com IVA:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function LaborForm({
  form,
  setForm,
}: {
  form: { description: string; hours: string; hourRate: string }
  setForm: (f: { description: string; hours: string; hourRate: string }) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Descrição *</Label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Horas *</Label>
          <Input type="number" step="0.5" min="0.5" value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Valor/Hora (€)</Label>
          <Input type="number" step="0.01" min="0" value={form.hourRate}
            onChange={(e) => setForm({ ...form, hourRate: e.target.value })} />
        </div>
      </div>
      {form.hours && form.hourRate && (
        <p className="text-sm text-muted-foreground">
          Total: {formatCurrency(parseFloat(form.hours) * parseFloat(form.hourRate))}
        </p>
      )}
    </div>
  )
}
