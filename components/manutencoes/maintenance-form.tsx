"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { maintenanceSchema, type MaintenanceInput } from "@/lib/validations"
import { createMaintenance } from "@/app/actions/maintenance"
import { toast } from "@/hooks/use-toast"

interface MaintenanceFormProps {
  customers: { id: string; name: string }[]
  vehicles: { id: string; plate: string; brand: string; model: string; customerId: string }[]
  technicians: { id: string; name: string | null }[]
  quotes: { id: string; number: string; customerId: string; vehicleId: string | null }[]
  defaultCustomerId?: string
  defaultVehicleId?: string
}

export function MaintenanceForm({
  customers,
  vehicles,
  technicians,
  quotes,
  defaultCustomerId,
  defaultVehicleId,
}: MaintenanceFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId ?? "")
  const [createQuote, setCreateQuote] = useState(true)

  const filteredVehicles = vehicles.filter((v) => !selectedCustomerId || v.customerId === selectedCustomerId)
  const filteredQuotes = quotes.filter((q) => !selectedCustomerId || q.customerId === selectedCustomerId)

  const today = new Date().toISOString().split("T")[0]

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MaintenanceInput>({
    resolver: zodResolver(maintenanceSchema) as never,
    defaultValues: {
      customerId: defaultCustomerId ?? "",
      vehicleId: defaultVehicleId ?? "",
      date: today,
    },
  })

  const onSubmit = (data: MaintenanceInput) => {
    startTransition(async () => {
      const result = await createMaintenance({ ...data, createQuote })
      if (result.success) {
        toast({ title: "Manutenção registada" })
        if (createQuote && result.data?.quoteId) {
          toast({ title: "Orçamento criado automaticamente", description: "A abrir o orçamento..." })
          router.push(`/orcamentos/${result.data.quoteId}`)
        } else {
          router.push("/manutencoes")
        }
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Detalhes da Manutenção</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                defaultValue={defaultCustomerId ?? ""}
                onValueChange={(v) => { setValue("customerId", v); setSelectedCustomerId(v) }}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Veículo *</Label>
              <Select
                defaultValue={defaultVehicleId ?? ""}
                onValueChange={(v) => setValue("vehicleId", v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar veículo" /></SelectTrigger>
                <SelectContent>
                  {filteredVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && <p className="text-xs text-destructive">{errors.vehicleId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mileage">Quilometragem</Label>
              <Input id="mileage" type="number" min="0" placeholder="50000" {...register("mileage")} />
            </div>

            <div className="space-y-2">
              <Label>Técnico Responsável</Label>
              <Select onValueChange={(v) => setValue("technicianId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar técnico" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="laborHours">Horas de Mão de Obra</Label>
              <Input id="laborHours" type="number" step="0.5" min="0" {...register("laborHours")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descrição do Serviço *</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Descreva o trabalho realizado, peças substituídas, etc."
                {...register("description")}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Observações Internas</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-create quote option */}
      <Card className={createQuote ? "border-primary/40 bg-primary/5" : ""}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className={`h-5 w-5 ${createQuote ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium">Criar orçamento automaticamente</p>
                <p className="text-xs text-muted-foreground">
                  Cria um orçamento em rascunho pré-preenchido com os dados desta manutenção
                </p>
              </div>
            </div>
            <Switch
              checked={createQuote}
              onCheckedChange={setCreateQuote}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {createQuote ? "Registar e Criar Orçamento" : "Registar Manutenção"}
        </Button>
      </div>
    </form>
  )
}
