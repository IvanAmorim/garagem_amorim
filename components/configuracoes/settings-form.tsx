"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save, Building2, Euro, Receipt, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { workshopSettingsSchema, type WorkshopSettingsInput } from "@/lib/validations"
import { upsertWorkshopSettings } from "@/app/actions/settings"
import { toast } from "@/hooks/use-toast"
import type { WorkshopSettings } from "@/types"
import { decimalToNumber } from "@/lib/utils"

interface SettingsFormProps {
  settings: WorkshopSettings | null
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkshopSettingsInput>({
    resolver: zodResolver(workshopSettingsSchema) as never,
    defaultValues: settings
      ? {
          name: settings.name,
          address: settings.address ?? "",
          nif: settings.nif ?? "",
          phone: settings.phone ?? "",
          email: settings.email ?? "",
          laborHourRate: decimalToNumber(settings.laborHourRate),
          defaultTaxRate: decimalToNumber(settings.defaultTaxRate),
          quotePrefix: settings.quotePrefix,
          defaultTerms: settings.defaultTerms ?? "",
          defaultNotes: settings.defaultNotes ?? "",
        }
      : {
          name: "",
          laborHourRate: 50,
          defaultTaxRate: 23,
          quotePrefix: "ORC",
        },
  })

  const onSubmit = (data: WorkshopSettingsInput) => {
    startTransition(async () => {
      const result = await upsertWorkshopSettings(data)
      if (result.success) {
        toast({ title: "Configurações guardadas" })
      } else {
        toast({ title: "Erro ao guardar", description: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Workshop Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Dados da Oficina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome da Oficina *</Label>
              <Input id="name" placeholder="Oficina do João" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nif">NIF</Label>
              <Input id="nif" placeholder="500123456" {...register("nif")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" placeholder="+351 212 345 678" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="geral@oficina.pt" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Morada</Label>
              <Input id="address" placeholder="Rua das Flores, 10, 1000-001 Lisboa" {...register("address")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="h-4 w-4" />
            Preços e Fiscalidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="laborHourRate">Valor/Hora de Mão de Obra (€)</Label>
              <Input id="laborHourRate" type="number" step="0.01" min="0" {...register("laborHourRate")} />
              {errors.laborHourRate && <p className="text-xs text-destructive">{errors.laborHourRate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultTaxRate">Taxa de IVA por Defeito (%)</Label>
              <Input id="defaultTaxRate" type="number" step="0.1" min="0" max="100" {...register("defaultTaxRate")} />
              {errors.defaultTaxRate && <p className="text-xs text-destructive">{errors.defaultTaxRate.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quote Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Numeração de Orçamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quotePrefix">Prefixo dos Orçamentos</Label>
            <Input
              id="quotePrefix"
              placeholder="ORC"
              maxLength={10}
              {...register("quotePrefix")}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Exemplo: ORC → ORC-00001, ORC-00002...
            </p>
            {errors.quotePrefix && <p className="text-xs text-destructive">{errors.quotePrefix.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Default texts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Textos Padrão para Orçamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultTerms">Condições Comerciais</Label>
            <Textarea
              id="defaultTerms"
              rows={4}
              placeholder="Orçamento válido por 30 dias. Trabalhos garantidos por 6 meses..."
              {...register("defaultTerms")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultNotes">Observações Padrão</Label>
            <Textarea
              id="defaultNotes"
              rows={3}
              placeholder="Preços sujeitos a IVA à taxa legal em vigor..."
              {...register("defaultNotes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Configurações
        </Button>
      </div>
    </form>
  )
}
