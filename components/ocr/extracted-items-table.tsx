"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Edit2, Users, Car, FileText, Wrench, Filter } from "lucide-react"
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
  taxRate: number | null
  total: number
  status: string
  customerId: string | null | undefined
  vehicleId: string | null | undefined
  quoteId: string | null | undefined
  maintenanceRecordId: string | null | undefined
  customer: { id: string; name: string } | null
  vehicle: { id: string; plate: string; brand: string; model: string } | null
  quote: { id: string; number: string } | null
  maintenanceRecord: { id: string; description: string; date: Date } | null
  uploadedDocument: { name: string; uploadedAt: Date }
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

  const handleAssign = () => {
    if (selectedIds.size === 0) return
    startTransition(async () => {
      const result = await assignInvoiceItems({
        itemIds: Array.from(selectedIds),
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
      taxRate: item.taxRate != null ? String(item.taxRate) : "",
    })
    setShowEditDialog(item)
  }

  const handleSaveEdit = () => {
    if (!showEditDialog) return
    startTransition(async () => {
      await updateExtractedItem(showEditDialog.id, {
        description: editData.description,
        reference: editData.reference || undefined,
        quantity: parseFloat(editData.quantity),
        unitPrice: parseFloat(editData.unitPrice),
        taxRate: editData.taxRate ? parseFloat(editData.taxRate) : undefined,
        total: parseFloat(editData.quantity) * parseFloat(editData.unitPrice) * (1 + (editData.taxRate ? parseFloat(editData.taxRate) / 100 : 0)),
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
          {/* Select all */}
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
            {filteredItems.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  {item.status === "UNASSIGNED" && (
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="mt-0.5"
                    />
                  )}

                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {/* Item details */}
                    <div className="sm:col-span-2">
                      <p className="font-medium text-sm">{item.description}</p>
                      {item.reference && <p className="text-xs text-muted-foreground">Ref: {item.reference}</p>}
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                        {item.taxRate != null ? ` + IVA ${item.taxRate}%` : ""}
                        {" = "}{formatCurrency(item.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fatura: {item.uploadedDocument.name}
                      </p>
                    </div>

                    {/* Assignments */}
                    <div className="space-y-0.5">
                      {item.customer && (
                        <div className="flex items-center gap-1 text-xs">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{item.customer.name}</span>
                        </div>
                      )}
                      {item.vehicle && (
                        <div className="flex items-center gap-1 text-xs">
                          <Car className="h-3 w-3 text-muted-foreground" />
                          <span>{item.vehicle.plate}</span>
                        </div>
                      )}
                      {item.quote && (
                        <div className="flex items-center gap-1 text-xs">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span>{item.quote.number}</span>
                        </div>
                      )}
                      {item.maintenanceRecord && (
                        <div className="flex items-center gap-1 text-xs">
                          <Wrench className="h-3 w-3 text-muted-foreground" />
                          <span>{item.maintenanceRecord.description.slice(0, 30)}</span>
                        </div>
                      )}
                    </div>

                    {/* Status & actions */}
                    <div className="flex items-start justify-between gap-2 sm:flex-col sm:items-end">
                      <Badge variant={statusBadge[item.status as keyof typeof statusBadge] ?? "secondary"}>
                        {getInvoiceItemStatusLabel(item.status)}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(item)}
                          title="Editar"
                        >
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
                  </div>
                </div>
              </div>
            ))}
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
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>Qtd.</Label>
                <Input type="number" step="0.001" value={editData.quantity} onChange={(e) => setEditData({ ...editData, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>P. Unit.</Label>
                <Input type="number" step="0.01" value={editData.unitPrice} onChange={(e) => setEditData({ ...editData, unitPrice: e.target.value })} />
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
