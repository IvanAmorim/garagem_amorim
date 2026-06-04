import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { pt } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(num)
}

export function formatDate(date: Date | string, pattern = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, pattern, { locale: pt })
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd/MM/yyyy HH:mm")
}

export function generateQuoteNumber(prefix: string, counter: number): string {
  return `${prefix}-${String(counter).padStart(5, "0")}`
}

export function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  return parseFloat(String(value))
}

export function calculateItemTotal(
  quantity: number,
  unitPrice: number,
  taxRate: number = 0
): number {
  const subtotal = quantity * unitPrice
  return subtotal + subtotal * (taxRate / 100)
}

export function getStockStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    AVAILABLE: "Disponível",
    LOW: "Stock Baixo",
    OUT_OF_STOCK: "Esgotado",
  }
  return labels[status] ?? status
}

export function getQuoteStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    IN_PROGRESS: "Em Execução",
    COMPLETED: "Concluído",
    PAID: "Pago",
  }
  return labels[status] ?? status
}

export function getFuelTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    GASOLINE: "Gasolina",
    DIESEL: "Diesel",
    ELECTRIC: "Elétrico",
    HYBRID: "Híbrido",
    LPG: "GPL",
    OTHER: "Outro",
  }
  return labels[type] ?? type
}

export function getTransmissionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MANUAL: "Manual",
    AUTOMATIC: "Automática",
    CVT: "CVT",
    OTHER: "Outra",
  }
  return labels[type] ?? type
}

export function getInvoiceItemStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    UNASSIGNED: "Por Atribuir",
    ASSIGNED: "Atribuído",
    IGNORED: "Ignorado",
  }
  return labels[status] ?? status
}

export function getStockUnitLabel(unit: string): string {
  const labels: Record<string, string> = {
    UNIT: "Un.",
    LITER: "L",
    KG: "Kg",
    METER: "m",
    BOX: "Cx.",
    SET: "Conj.",
  }
  return labels[unit] ?? unit
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + "…"
}
