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
import { customerSchema, type CustomerInput } from "@/lib/validations"
import { createCustomer, updateCustomer } from "@/app/actions/customers"
import { toast } from "@/hooks/use-toast"
import type { Customer } from "@/types"

interface CustomerFormProps {
  customer?: Customer
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!customer

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema) as never,
    defaultValues: customer
      ? {
          name: customer.name,
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          nif: customer.nif ?? "",
          address: customer.address ?? "",
          notes: customer.notes ?? "",
          status: customer.status,
        }
      : { status: "ACTIVE" },
  })

  const onSubmit = (data: CustomerInput) => {
    startTransition(async () => {
      const result = isEditing
        ? await updateCustomer(customer.id, data)
        : await createCustomer(data)

      if (result.success) {
        toast({
          title: isEditing ? "Cliente atualizado" : "Cliente criado",
          variant: "default",
        })
        if (!isEditing && "data" in result && result.data) {
          router.push(`/clientes/${result.data.id}`)
        } else {
          router.push(`/clientes/${customer?.id}`)
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
          <CardTitle className="text-base">Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" placeholder="Nome completo" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" placeholder="+351 912 345 678" {...register("phone")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="email@exemplo.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nif">NIF</Label>
              <Input id="nif" placeholder="123456789" {...register("nif")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                defaultValue={customer?.status ?? "ACTIVE"}
                onValueChange={(v) => setValue("status", v as "ACTIVE" | "INACTIVE")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Morada</Label>
              <Input id="address" placeholder="Rua, número, código postal, cidade" {...register("address")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" placeholder="Notas internas sobre o cliente..." rows={3} {...register("notes")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEditing ? "Guardar Alterações" : "Criar Cliente"}
        </Button>
      </div>
    </form>
  )
}
