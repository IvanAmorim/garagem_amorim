"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteCustomer } from "@/app/actions/customers"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface CustomerActionsProps {
  customerId: string
  customerName: string
}

export function CustomerActions({ customerId, customerName }: CustomerActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm(`Eliminar cliente "${customerName}"? Esta ação não pode ser revertida.`)) return

    startTransition(async () => {
      const result = await deleteCustomer(customerId)
      if (result.success) {
        toast({ title: "Cliente eliminado", variant: "default" })
        router.refresh()
      } else {
        toast({ title: "Erro ao eliminar", description: result.error, variant: "destructive" })
      }
    })
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
          <Link href={`/clientes/${customerId}`}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Ficha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/clientes/${customerId}/editar`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
