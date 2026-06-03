"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Edit, Trash2, Plus, Minus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { deleteStockItem, addStockMovement } from "@/app/actions/stock"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface StockActionsProps {
  stockItemId: string
  stockItemName: string
}

type MovementType = "IN" | "OUT" | "ADJUSTMENT"

export function StockActions({ stockItemId, stockItemName }: StockActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [movementDialog, setMovementDialog] = useState<MovementType | null>(null)
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")

  const handleDelete = () => {
    if (!confirm(`Eliminar "${stockItemName}"?`)) return
    startTransition(async () => {
      const result = await deleteStockItem(stockItemId)
      if (result.success) {
        toast({ title: "Item eliminado" })
        router.refresh()
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleMovement = () => {
    if (!movementDialog || !quantity) return
    startTransition(async () => {
      const result = await addStockMovement({
        stockItemId,
        type: movementDialog,
        quantity: parseFloat(quantity),
        notes: notes || undefined,
      })
      if (result.success) {
        toast({
          title: movementDialog === "IN" ? "Entrada registada" : movementDialog === "OUT" ? "Saída registada" : "Stock ajustado",
        })
        setMovementDialog(null)
        setQuantity("")
        setNotes("")
        router.refresh()
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  const movementLabels = {
    IN: "Entrada de Stock",
    OUT: "Saída de Stock",
    ADJUSTMENT: "Ajuste de Stock",
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setMovementDialog("IN")}>
            <Plus className="h-4 w-4 mr-2 text-success" />Entrada
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMovementDialog("OUT")}>
            <Minus className="h-4 w-4 mr-2 text-destructive" />Saída
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMovementDialog("ADJUSTMENT")}>
            <RefreshCw className="h-4 w-4 mr-2 text-warning" />Ajuste
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/stock/${stockItemId}/editar`}>
              <Edit className="h-4 w-4 mr-2" />Editar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="h-4 w-4 mr-2" />Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!movementDialog} onOpenChange={(o) => !o && setMovementDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{movementDialog ? movementLabels[movementDialog] : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{stockItemName}</p>
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Motivo ou observação..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialog(null)}>Cancelar</Button>
            <Button onClick={handleMovement} disabled={isPending || !quantity}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
