"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Edit, Trash2, Eye, Download, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteQuote } from "@/app/actions/quotes"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface QuoteActionsProps {
  quoteId: string
  quoteNumber: string
}

export function QuoteActions({ quoteId, quoteNumber }: QuoteActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm(`Eliminar orçamento "${quoteNumber}"?`)) return
    startTransition(async () => {
      const result = await deleteQuote(quoteId)
      if (result.success) {
        toast({ title: "Orçamento eliminado" })
        router.refresh()
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleDownloadPdf = () => {
    window.open(`/api/pdf/quote/${quoteId}`, "_blank")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/orcamentos/${quoteId}`}>
            <Eye className="h-4 w-4 mr-2" />Ver Orçamento
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/orcamentos/${quoteId}/editar`}>
            <Edit className="h-4 w-4 mr-2" />Editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadPdf}>
          <Download className="h-4 w-4 mr-2" />Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="h-4 w-4 mr-2" />Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
