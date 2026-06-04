"use client"

import { useTransition } from "react"
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
import { vehicleSchema, type VehicleInput } from "@/lib/validations"
import { createVehicle, updateVehicle } from "@/app/actions/vehicles"
import { toast } from "@/hooks/use-toast"

interface VehicleData {
  id: string
  plate: string
  brand: string
  model: string
  year: number | null
  vin: string | null
  mileage: number | null
  fuelType: "GASOLINE" | "DIESEL" | "ELECTRIC" | "HYBRID" | "LPG" | "OTHER"
  transmissionType: "MANUAL" | "AUTOMATIC" | "CVT" | "OTHER" | null
  engineCode: string | null
  notes: string | null
  customerId: string
}

interface VehicleFormProps {
  vehicle?: VehicleData
  customers: { id: string; name: string }[]
  defaultCustomerId?: string
}

const fuelTypes = [
  { value: "GASOLINE", label: "Gasolina" },
  { value: "DIESEL", label: "Diesel" },
  { value: "ELECTRIC", label: "Elétrico" },
  { value: "HYBRID", label: "Híbrido" },
  { value: "LPG", label: "GPL" },
  { value: "OTHER", label: "Outro" },
]

const transmissionTypes = [
  { value: "MANUAL", label: "Manual" },
  { value: "AUTOMATIC", label: "Automática" },
  { value: "CVT", label: "CVT" },
  { value: "OTHER", label: "Outra" },
]

export function VehicleForm({ vehicle, customers, defaultCustomerId }: VehicleFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!vehicle

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema) as never,
    defaultValues: vehicle
      ? {
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year ?? undefined,
          vin: vehicle.vin ?? "",
          mileage: vehicle.mileage ?? undefined,
          fuelType: vehicle.fuelType,
          transmissionType: vehicle.transmissionType ?? undefined,
          engineCode: vehicle.engineCode ?? "",
          notes: vehicle.notes ?? "",
          customerId: vehicle.customerId,
        }
      : {
          fuelType: "GASOLINE",
          customerId: defaultCustomerId ?? "",
        },
  })

  const onSubmit = (data: VehicleInput) => {
    startTransition(async () => {
      const result = isEditing
        ? await updateVehicle(vehicle.id, data)
        : await createVehicle(data)

      if (result.success) {
        toast({ title: isEditing ? "Veículo atualizado" : "Veículo criado" })
        if (!isEditing && "data" in result && result.data) {
          router.push(`/veiculos/${result.data.id}`)
        } else {
          router.push(`/veiculos/${vehicle?.id}`)
        }
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Veículo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Cliente *</Label>
              <Select
                defaultValue={vehicle?.customerId ?? defaultCustomerId ?? ""}
                onValueChange={(v) => setValue("customerId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plate">Matrícula *</Label>
              <Input id="plate" placeholder="AA-00-AA" className="uppercase" {...register("plate")} />
              {errors.plate && <p className="text-xs text-destructive">{errors.plate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marca *</Label>
              <Input id="brand" placeholder="Toyota" {...register("brand")} />
              {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo *</Label>
              <Input id="model" placeholder="Corolla" {...register("model")} />
              {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Input id="year" type="number" placeholder="2020" {...register("year")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuelType">Combustível</Label>
              <Select
                defaultValue={vehicle?.fuelType ?? "GASOLINE"}
                onValueChange={(v) => setValue("fuelType", v as VehicleInput["fuelType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fuelTypes.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Caixa de Velocidades</Label>
              <Select
                defaultValue={vehicle?.transmissionType ?? ""}
                onValueChange={(v) => setValue("transmissionType", v === "" ? undefined : v as VehicleInput["transmissionType"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Não especificado" />
                </SelectTrigger>
                <SelectContent>
                  {transmissionTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="engineCode">Código de Motor</Label>
              <Input id="engineCode" placeholder="ex: 1NZ-FE" {...register("engineCode")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mileage">Quilometragem</Label>
              <Input id="mileage" type="number" placeholder="50000" {...register("mileage")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vin">VIN/Chassis</Label>
              <Input id="vin" placeholder="WBAVL..." {...register("vin")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" placeholder="Notas sobre o veículo..." rows={3} {...register("notes")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEditing ? "Guardar" : "Criar Veículo"}
        </Button>
      </div>
    </form>
  )
}
