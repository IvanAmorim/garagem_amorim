"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Edit2, Users, Car, FileText, Wrench, Tag, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { assignInvoiceItems, ignoreInvoiceItem, updateExtractedItem } from "@/app/actions/ocr"
import { toast } from "@/hooks/use-toast"
import { formatCurrency, getInvoiceItemStatusLabel } from "@/lib/utils"
import Link from "next/link"

interface ExtractedItem {
  id: string
  uploadedDocumentId: string
  description: string
  reference: string | null | undefined
  quantity: number
  unitPrice: number
  supplierDiscountPct: number | null
  purchaseUnitPrice: number | null
  taxRate: number | null
  total: number
  needsReview: boolean
  reviewReason: string | null
  status: string
  customerId: string | null | undefined
  vehicleId: string | null | undefined
  quoteId: string | null | undefined
  maintenanceRecordId: string | null | undefined
  customer: { id: string; name: string } | null
  vehicle: { id: string; plate: string; brand: string; model: string } | null
  quote: { id: string; number: string } | null
  maintenanceRecord: { id: string; description: string; date: Date } | null
  uploadedDocument: {
    name: string
    uploadedAt: Date
    invoiceRef: string | null
    invoiceDate: Date | null
  }
}

interface ExtractedItemsTableProps {
  items: ExtractedItem[]
  customers: { id: string; name: string }[]
  vehicles: { id: string; plate: string; brand: string; model: string; customerId: string }[]
  quotes: { id: string; number: string; customerId: string; vehicleId: string | null }[]
  maintenanceRecords: { id: string; description: string; date: Date; vehicleId: string; customerId: string }[]
  currentStatus?: string
}

const statusBadge = {
  UNASSIGNED: "warning" as const,
  ASSIGNED: "success" as const,
  IGNORED: "secondary" as const,
}

export function ExtractedItemsTable({
  items,
  customers,
  vehicles,
  quotes,
  maintenanceRecords,
  currentStatus,
}: ExtractedItemsTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState<ExtractedItem | null>(null)
  // Per-item customerDiscountApplied toggle state
  const [discountApplied, setDiscountApplied] = useState<Record<string, boolean>>({})

  const [assignment, setAssignment] = useState({
    customerId: "",
    vehicleId: "",
    quoteId: "",
    maintenanceRecordId: "",
  })

  const [editData, setEditData] = useState({
    description: "",
    reference: "",
    quantity: "",
    unitPrice: "",
    supplierDiscountPct: "",
    purchaseUnitPrice: "",
    taxRate: "",
  })

  const filteredItems = currentStatus && currentStatus !== "ALL"
    ? items.filter((i) => i.status === currentStatus)
    : items

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const unassigned = filteredItems.filter((i) => i.status === "UNASSIGNED")
    if (selectedIds.size === unassigned.length && unassigned.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(unassigned.map((i) => i.id)))
    }
  }

  const toggleDiscount = (id: string) => {
    setDiscountApplied((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAssign = () => {
    if (selectedIds.size === 0) return
    startTransition(async () => {
      const result = await assignInvoiceItems({
        items: Array.from(selectedIds).map((id) => ({
          id,
          customerDiscountApplied: discountApplied[id] ?? false,
        })),
        customerId: assignment.customerId || undefined,
        vehicleId: assignment.vehicleId || undefined,
        quoteId: assignment.quoteId || undefined,
        maintenanceRecordId: assignment.maintenanceRecordId || undefined,
      })
      if (result.success) {
        toast({
          title: "Peças atribuídas",
          description: `${selectedIds.size} peça(s) atribuída(s) com sucesso`,
        })
        setSelectedIds(new Set())
        setShowAssignDialog(false)
        setAssignment({ customerId: "", vehicleId: "", quoteId: "", maintenanceRecordId: "" })
        router.refresh()
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleIgnore = (id: string) => {
    startTransition(async () => {
      await ignoreInvoiceItem(id)
      router.refresh()
    })
  }

  const openEdit = (item: ExtractedItem) => {
    setEditData({
      description: item.description,
      reference: item.reference ?? "",
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      supplierDiscountPct: item.supplierDiscountPct != null ? String(item.supplierDiscountPct) : "",
      purchaseUnitPrice: item.purchaseUnitPrice != null ? String(item.purchaseUnitPrice) : "",
      taxRate: item.taxRate != null ? String(item.taxRate) : "",
    })
    setShowEditDialog(item)
  }

  const handleSaveEdit = () => {
    if (!showEditDialog) return
    startTransition(async () => {
      const qty = parseFloat(editData.quantity)
      const unitP = parseFloat(editData.unitPrice)
      const discPct = editData.supplierDiscountPct ? parseFloat(editData.supplierDiscountPct) : undefined
      const purchaseP = editData.purchaseUnitPrice
        ? parseFloat(editData.purchaseUnitPrice)
        : discPct != null
          ? unitP * (1 - discPct / 100)
          : undefined
      const tax = editData.taxRate ? parseFloat(editData.taxRate) : undefined
      const total = qty * (purchaseP ?? unitP) * (1 + ((tax ?? 0) / 100))

      await updateExtractedItem(showEditDialog.id, {
        description: editData.description,
        reference: editData.reference || undefined,
        quantity: qty,
        unitPrice: unitP,
        supplierDiscountPct: discPct,
        purchaseUnitPrice: purchaseP,
        taxRate: tax,
        total,
      })
      toast({ title: "Artigo atualizado" })
      setShowEditDialog(null)
      router.refresh()
    })
  }

  const unassignedInFiltered = filteredItems.filter((i) => i.status === "UNASSIGNED")
  const filteredVehicles = assignment.customerId
    ? vehicles.filter((v) => v.customerId === assignment.customerId)
    : vehicles
  const filteredQuotes = assignment.customerId
    ? quotes.filter((q) => q.customerId === assignment.customerId)
    : quotes

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">
              Artigos Extraídos ({filteredItems.length})
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {(["ALL", "UNASSIGNED", "ASSIGNED", "IGNORED"] as const).map((s) => (
                <Link key={s} href={`/pecas-por-atribuir?status=${s}`}>
                  <Badge
                    variant={currentStatus === s || (!currentStatus && s === "ALL") ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                  >
                    {s === "ALL" ? "Todos" : getInvoiceItemStatusLabel(s)}
                    <span className="ml-1 opacity-70">
                      ({s === "ALL" ? items.length : items.filter((i) => i.status === s).length})
                    </span>
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
              <Button size="sm" onClick={() => setShowAssignDialog(true)}>
                <Check className="h-4 w-4" />
                Atribuir
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                <X className="h-4 w-4" />
                Limpar
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {unassignedInFiltered.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
              <Checkbox
                checked={selectedIds.size === unassignedInFiltered.length && unassignedInFiltered.length > 0}
                onCheckedChange={toggleAll}
              />
              <span className="text-xs text-muted-foreground">Selecionar todos por atribuir</span>
            </div>
          )}

          <div className="divide-y">
            {filteredItems.map((item) => {
              const hasDiscount = item.supplierDiscountPct != null && item.supplierDiscountPct > 0
              const purchasePrice = item.purchaseUnitPrice != null ? item.purchaseUnitPrice : item.unitPrice
              const isDiscountApplied = discountApplied[item.id] ?? false
              const clientPrice = isDiscountApplied ? purchasePrice : item.unitPrice

              return (
                <div key={item.id} className={`p-4 ${item.needsReview ? "bg-destructive/5 border-l-2 border-l-destructive" : ""}`}>
                  <div className="flex items-start gap-3">
                    {item.status === "UNASSIGNED" && (
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="mt-0.5"
                      />
                    )}

                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Row 1: description + status + actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{item.description}</p>
                          {item.reference && (
                            <p className="text-xs text-muted-foreground">Ref: {item.reference}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.needsReview && (
                            <Badge variant="destructive" className="text-xs gap-0.5" title={item.reviewReason ?? "Rever manualmente"}>
                              <AlertTriangle className="h-3 w-3" />
                              Rever
                            </Badge>
                          )}
                          <Badge variant={statusBadge[item.status as keyof typeof statusBadge] ?? "secondary"} className="text-xs">
                            {getInvoiceItemStatusLabel(item.status)}
                          </Badge>
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)} title="Editar">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {item.status === "UNASSIGNED" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-success"
                                onClick={() => {
                                  setSelectedIds(new Set([item.id]))
                                  setShowAssignDialog(true)
                                }}
                                title="Atribuir"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground"
                                onClick={() => handleIgnore(item.id)}
                                disabled={isPending}
                                title="Ignorar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Row 2: pricing breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                        <div>
                          <span className="text-muted-foreground">Qtd</span>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">P. Lista (s/ desc.)</span>
                          <p className="font-medium">{formatCurrency(item.unitPrice)}</p>
                        </div>
                        {hasDiscount && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Desc. fornecedor</span>
                              <p className="font-medium text-orange-600">{item.supplierDiscountPct}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Custo oficina</span>
                              <p className="font-medium text-blue-600">{formatCurrency(purchasePrice)}</p>
                            </div>
                          </>
                        )}
                        <div>
                          <span className="text-muted-foreground">IVA</span>
                          <p className="font-medium">{item.taxRate != null ? `${item.taxRate}%` : "—"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total (c/ IVA)</span>
                          <p className="font-medium">{formatCurrency(item.total)}</p>
                        </div>
                      </div>

                      {/* Row 3: discount toggle (only if there's a supplier discount) */}
                      {hasDiscount && item.status === "UNASSIGNED" && (
                        <button
                          type="button"
                          onClick={() => toggleDiscount(item.id)}
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${
                            isDiscountApplied
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-muted text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {isDiscountApplied ? (
                            <ToggleRight className="h-3.5 w-3.5" />
                          ) : (
                            <ToggleLeft className="h-3.5 w-3.5" />
                          )}
                          Aplicar desconto ao cliente
                          {isDiscountApplied && (
                            <span className="ml-1 font-medium">
                              → cliente paga {formatCurrency(clientPrice)}
                            </span>
                          )}
                          {!isDiscountApplied && (
                            <span className="ml-1">
                              → cliente paga {formatCurrency(item.unitPrice)}
                            </span>
                          )}
                        </button>
                      )}

                      {/* Review warning */}
                      {item.needsReview && item.reviewReason && (
                        <div className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          <span>{item.reviewReason}</span>
                        </div>
                      )}

                      {/* Row 4: invoice metadata + assignments */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground border-t pt-2">
                        {item.uploadedDocument.invoiceRef && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {item.uploadedDocument.invoiceRef}
                          </span>
                        )}
                        {item.uploadedDocument.invoiceDate && (
                          <span>{formatDate(item.uploadedDocument.invoiceDate)}</span>
                        )}
                        <span className="opacity-60">{item.uploadedDocument.name}</span>

                        {item.customer && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />{item.customer.name}
                          </span>
                        )}
                        {item.vehicle && (
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3" />{item.vehicle.plate}
                          </span>
                        )}
                        {item.quote && (
                          <Link href={`/orcamentos/${item.quote.id}`} className="flex items-center gap-1 text-primary hover:underline">
                            <FileText className="h-3 w-3" />{item.quote.number}
                          </Link>
                        )}
                        {item.maintenanceRecord && (
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {item.maintenanceRecord.description.slice(0, 30)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={(o) => !o && setShowAssignDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir {selectedIds.size} Artigo(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o destino dos artigos. Pode preencher um ou mais campos.
            </p>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={assignment.customerId}
                onValueChange={(v) => setAssignment({ ...assignment, customerId: v, vehicleId: "", quoteId: "" })}
              >
                <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select
                value={assignment.vehicleId}
                onValueChange={(v) => setAssignment({ ...assignment, vehicleId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Sem veículo" /></SelectTrigger>
                <SelectContent>
                  {filteredVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Orçamento</Label>
              <Select
                value={assignment.quoteId}
                onValueChange={(v) => setAssignment({ ...assignment, quoteId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Sem orçamento" /></SelectTrigger>
                <SelectContent>
                  {filteredQuotes.map((q) => (
                    <SelectItem key={q.id} value={q.id}>{q.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Serviço/Manutenção</Label>
              <Select
                value={assignment.maintenanceRecordId}
                onValueChange={(v) => setAssignment({ ...assignment, maintenanceRecordId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Sem serviço" /></SelectTrigger>
                <SelectContent>
                  {maintenanceRecords.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {formatDate(m.date)} – {m.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignment.quoteId && (
              <p className="text-xs text-success bg-success/10 p-2 rounded">
                Os artigos serão adicionados automaticamente ao orçamento selecionado.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleAssign}
              disabled={isPending || (!assignment.customerId && !assignment.vehicleId && !assignment.quoteId && !assignment.maintenanceRecordId)}
            >
              Confirmar Atribuição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!showEditDialog} onOpenChange={(o) => !o && setShowEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Artigo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Referência</Label>
              <Input value={editData.reference} onChange={(e) => setEditData({ ...editData, reference: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Qtd.</Label>
                <Input type="number" step="0.001" value={editData.quantity} onChange={(e) => setEditData({ ...editData, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>P. Lista (s/ desc.)</Label>
                <Input type="number" step="0.01" value={editData.unitPrice} onChange={(e) => setEditData({ ...editData, unitPrice: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Desc. forn. %</Label>
                <Input type="number" step="0.1" min="0" max="100" value={editData.supplierDiscountPct} onChange={(e) => setEditData({ ...editData, supplierDiscountPct: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Custo oficina</Label>
                <Input type="number" step="0.01" value={editData.purchaseUnitPrice} onChange={(e) => setEditData({ ...editData, purchaseUnitPrice: e.target.value })} placeholder="Auto" />
              </div>
              <div className="space-y-2">
                <Label>IVA %</Label>
                <Input type="number" step="0.1" value={editData.taxRate} onChange={(e) => setEditData({ ...editData, taxRate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("pt-PT")
}
