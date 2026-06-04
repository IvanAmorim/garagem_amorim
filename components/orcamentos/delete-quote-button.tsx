"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { deleteQuote } from "@/app/actions/quotes"
import { toast } from "@/hooks/use-toast"

export function DeleteQuoteButton({ quoteId, quoteNumber }: { quoteId: string; quoteNumber: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteQuote(quoteId)
      if (result.success) {
        toast({ title: "Orçamento eliminado" })
        router.push("/orcamentos")
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Eliminar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar orçamento</DialogTitle>
            <DialogDescription>
              Tem a certeza que quer eliminar o orçamento <strong>{quoteNumber}</strong>?
              Esta ação é irreversível e devolve os artigos ao stock.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
