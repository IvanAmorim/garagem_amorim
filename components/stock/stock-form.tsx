"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { stockItemSchema, type StockItemInput } from "@/lib/validations"
import { createStockItem, updateStockItem } from "@/app/actions/stock"
import { toast } from "@/hooks/use-toast"
interface StockData {
  id: string
  name: string
  internalRef: string | null
  supplierRef: string | null
  category: string | null
  brand: string | null
  quantity: number
  minQuantity: number
  unit: "UNIT" | "LITER" | "KG" | "METER" | "BOX" | "SET"
  costPrice: number | null
  salePrice: number | null
  supplier: string | null
  location: string | null
}

interface StockFormProps {
  item?: StockData
}

const units = [
  { value: "UNIT", label: "Unidade" },
  { value: "LITER", label: "Litro" },
  { value: "KG", label: "Kg" },
  { value: "METER", label: "Metro" },
  { value: "BOX", label: "Caixa" },
  { value: "SET", label: "Conjunto" },
]

export function StockForm({ item }: StockFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!item

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StockItemInput>({
    resolver: zodResolver(stockItemSchema) as never,
    defaultValues: item
      ? {
          name: item.name,
          internalRef: item.internalRef ?? "",
          supplierRef: item.supplierRef ?? "",
          category: item.category ?? "",
          brand: item.brand ?? "",
          quantity: item.quantity,
          minQuantity: item.minQuantity,
          unit: item.unit,
          costPrice: item.costPrice ?? undefined,
          salePrice: item.salePrice ?? undefined,
          supplier: item.supplier ?? "",
          location: item.location ?? "",
        }
      : { quantity: 0, minQuantity: 0, unit: "UNIT" },
  })

  const onSubmit = (data: StockItemInput) => {
    startTransition(async () => {
      const result = isEditing
        ? await updateStockItem(item.id, data)
        : await createStockItem(data)

      if (result.success) {
        toast({ title: isEditing ? "Item atualizado" : "Item criado" })
        router.push("/stock")
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Informações do Item</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" placeholder="Nome do componente" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="internalRef">Referência Interna</Label>
              <Input id="internalRef" placeholder="REF-001" {...register("internalRef")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierRef">Ref. Fornecedor</Label>
              <Input id="supplierRef" placeholder="FRN-0001" {...register("supplierRef")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" placeholder="Filtros, Travões, Óleo..." {...register("category")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" placeholder="Bosch, Castrol..." {...register("brand")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Stock e Localização</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade Atual *</Label>
              <Input id="quantity" type="number" step="0.001" min="0" {...register("quantity")} />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="minQuantity">Qtd. Mínima</Label>
              <Input id="minQuantity" type="number" step="0.001" min="0" {...register("minQuantity")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Select
                defaultValue={item?.unit ?? "UNIT"}
                onValueChange={(v) => setValue("unit", v as StockItemInput["unit"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Preço de Custo (€)</Label>
              <Input id="costPrice" type="number" step="0.01" min="0" {...register("costPrice")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Preço de Venda (€)</Label>
              <Input id="salePrice" type="number" step="0.01" min="0" {...register("salePrice")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input id="supplier" placeholder="Nome do fornecedor" {...register("supplier")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="location">Localização</Label>
              <Input id="location" placeholder="Prateleira A2, Gaveta 3..." {...register("location")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEditing ? "Guardar" : "Criar Item"}
        </Button>
      </div>
    </form>
  )
}
