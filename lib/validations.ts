import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Password obrigatória"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Password deve ter pelo menos 8 caracteres"),
  role: z.enum(["ADMIN", "MECHANIC", "VIEWER"]).default("MECHANIC"),
})

export const customerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  nif: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
})

export const vehicleSchema = z.object({
  plate: z.string().min(1, "Matrícula obrigatória").toUpperCase(),
  brand: z.string().min(1, "Marca obrigatória"),
  model: z.string().min(1, "Modelo obrigatório"),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  vin: z.string().optional(),
  mileage: z.coerce.number().int().min(0).optional(),
  fuelType: z.enum(["GASOLINE", "DIESEL", "ELECTRIC", "HYBRID", "LPG", "OTHER"]).default("GASOLINE"),
  notes: z.string().optional(),
  customerId: z.string().min(1, "Cliente obrigatório"),
})

export const stockItemSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  internalRef: z.string().optional(),
  supplierRef: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantidade deve ser positiva"),
  minQuantity: z.coerce.number().min(0, "Quantidade mínima deve ser positiva"),
  unit: z.enum(["UNIT", "LITER", "KG", "METER", "BOX", "SET"]).default("UNIT"),
  costPrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0).optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
})

export const stockMovementSchema = z.object({
  stockItemId: z.string().min(1, "Item obrigatório"),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.coerce.number().min(0.001, "Quantidade deve ser maior que 0"),
  notes: z.string().optional(),
})

export const quoteItemSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  reference: z.string().optional(),
  quantity: z.coerce.number().min(0.001, "Quantidade deve ser maior que 0"),
  unitPrice: z.coerce.number().min(0, "Preço deve ser positivo"),
  taxRate: z.coerce.number().min(0).max(100),
  stockItemId: z.string().optional(),
})

export const laborItemSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  hours: z.coerce.number().min(0.1, "Horas deve ser maior que 0"),
  hourRate: z.coerce.number().min(0, "Valor/hora deve ser positivo"),
})

export const quoteSchema = z.object({
  customerId: z.string().min(1, "Cliente obrigatório"),
  vehicleId: z.string().optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "PAID"]).default("DRAFT"),
  validUntil: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).default(23),
  discount: z.coerce.number().min(0).default(0),
  laborHourRate: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
})

export const maintenanceSchema = z.object({
  customerId: z.string().min(1, "Cliente obrigatório"),
  vehicleId: z.string().min(1, "Veículo obrigatório"),
  date: z.string().min(1, "Data obrigatória"),
  mileage: z.coerce.number().int().min(0).optional(),
  description: z.string().min(1, "Descrição obrigatória"),
  laborHours: z.coerce.number().min(0).optional(),
  technicianId: z.string().optional(),
  quoteId: z.string().optional(),
  notes: z.string().optional(),
})

export const workshopSettingsSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  address: z.string().optional(),
  nif: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  logoUrl: z.string().optional(),
  laborHourRate: z.coerce.number().min(0),
  defaultTaxRate: z.coerce.number().min(0).max(100),
  quotePrefix: z.string().min(1, "Prefixo obrigatório"),
  defaultTerms: z.string().optional(),
  defaultNotes: z.string().optional(),
})

export const assignInvoiceItemSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    customerDiscountApplied: z.boolean().default(false),
  })).min(1, "Selecione pelo menos um item"),
  customerId: z.string().optional(),
  vehicleId: z.string().optional(),
  quoteId: z.string().optional(),
  maintenanceRecordId: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type VehicleInput = z.infer<typeof vehicleSchema>
export type StockItemInput = z.infer<typeof stockItemSchema>
export type StockMovementInput = z.infer<typeof stockMovementSchema>
export type QuoteItemInput = z.infer<typeof quoteItemSchema>
export type LaborItemInput = z.infer<typeof laborItemSchema>
export type QuoteInput = z.infer<typeof quoteSchema>
export type MaintenanceInput = z.infer<typeof maintenanceSchema>
export type WorkshopSettingsInput = z.infer<typeof workshopSettingsSchema>
export type AssignInvoiceItemInput = z.infer<typeof assignInvoiceItemSchema>
