"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { quoteSchema, type QuoteInput } from "@/lib/validations"
import { updateQuote } from "@/app/actions/quotes"
import { toast } from "@/hooks/use-toast"
import { decimalToNumber } from "@/lib/utils"

interface QuoteEditFormProps {
  quote: {
    id: string
    customerId: string
    vehicleId: string | null
    status: string
    validUntil: Date | null
    taxRate: unknown
    discount: unknown
    laborHourRate: unknown
    notes: string | null
    terms: string | null
  }
  customers: { id: string; name: string }[]
  vehicles: { id: string; plate: string; brand: string; model: string; customerId: string }[]
}

export function QuoteEditForm({ quote, customers, vehicles }: QuoteEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedCustomerId, setSelectedCustomerId] = useState(quote.customerId)

  const filteredVehicles = vehicles.filter((v) => !selectedCustomerId || v.customerId === selectedCustomerId)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<QuoteInput>({
    resolver: zodResolver(quoteSchema) as never,
    defaultValues: {
      customerId: quote.customerId,
      vehicleId: quote.vehicleId ?? "",
      status: quote.status as QuoteInput["status"],
      validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split("T")[0] : "",
      taxRate: decimalToNumber(quote.taxRate),
      discount: decimalToNumber(quote.discount),
      laborHourRate: quote.laborHourRate ? decimalToNumber(quote.laborHourRate) : undefined,
      notes: quote.notes ?? "",
      terms: quote.terms ?? "",
    },
  })

  const onSubmit = (data: QuoteInput) => {
    startTransition(async () => {
      const result = await updateQuote(quote.id, data)
      if (result.success) {
        toast({ title: "Orçamento atualizado" })
        router.push(`/orcamentos/${quote.id}`)
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Informações do Orçamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                defaultValue={quote.customerId}
                onValueChange={(v) => { setValue("customerId", v); setSelectedCustomerId(v) }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select defaultValue={quote.vehicleId ?? ""} onValueChange={(v) => setValue("vehicleId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar veículo" /></SelectTrigger>
                <SelectContent>
                  {filteredVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select defaultValue={quote.status} onValueChange={(v) => setValue("status", v as QuoteInput["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Rascunho</SelectItem>
                  <SelectItem value="SENT">Enviado</SelectItem>
                  <SelectItem value="APPROVED">Aprovado</SelectItem>
                  <SelectItem value="REJECTED">Recusado</SelectItem>
                  <SelectItem value="CONVERTED">Convertido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Válido até</Label>
              <Input id="validUntil" type="date" {...register("validUntil")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">IVA (%)</Label>
              <Input id="taxRate" type="number" step="0.1" {...register("taxRate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="laborHourRate">Valor/Hora (€)</Label>
              <Input id="laborHourRate" type="number" step="0.01" {...register("laborHourRate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Desconto (€)</Label>
              <Input id="discount" type="number" step="0.01" min="0" {...register("discount")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="terms">Condições Comerciais</Label>
              <Textarea id="terms" rows={2} {...register("terms")} />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </div>
    </form>
  )
}
