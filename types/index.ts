import type {
  User,
  Customer,
  Vehicle,
  Quote,
  QuoteItem,
  LaborItem,
  StockItem,
  StockMovement,
  MaintenanceRecord,
  WorkshopSettings,
  UploadedDocument,
  ExtractedInvoiceItem,
  UserRole,
  CustomerStatus,
  FuelType,
  StockStatus,
  StockUnit,
  StockMovementType,
  QuoteStatus,
  InvoiceItemStatus,
} from "@/app/generated/prisma/client"

export type {
  User,
  Customer,
  Vehicle,
  Quote,
  QuoteItem,
  LaborItem,
  StockItem,
  StockMovement,
  MaintenanceRecord,
  WorkshopSettings,
  UploadedDocument,
  ExtractedInvoiceItem,
  UserRole,
  CustomerStatus,
  FuelType,
  StockStatus,
  StockUnit,
  StockMovementType,
  QuoteStatus,
  InvoiceItemStatus,
}

export type CustomerWithVehicles = Customer & {
  vehicles: Vehicle[]
  _count: { quotes: number; maintenanceRecords: number }
}

export type VehicleWithCustomer = Vehicle & {
  customer: Customer
  _count: { quotes: number; maintenanceRecords: number }
}

export type QuoteWithRelations = Quote & {
  customer: Customer
  vehicle: Vehicle | null
  items: QuoteItem[]
  laborItems: LaborItem[]
}

export type MaintenanceWithRelations = MaintenanceRecord & {
  customer: Customer
  vehicle: Vehicle
  technician: User | null
  quote: Quote | null
}

export type StockItemWithMovements = StockItem & {
  movements: StockMovement[]
}

export type ExtractedItemWithRelations = ExtractedInvoiceItem & {
  uploadedDocument: UploadedDocument
  customer: Customer | null
  vehicle: Vehicle | null
  quote: Quote | null
  maintenanceRecord: MaintenanceRecord | null
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export type PaginationParams = {
  page?: number
  limit?: number
  search?: string
}

export type DashboardStats = {
  totalCustomers: number
  totalVehicles: number
  pendingQuotes: number
  approvedQuotes: number
  activeServices: number
  lowStockItems: number
  outOfStockItems: number
  monthlyTotal: number
  recentMaintenance: MaintenanceWithRelations[]
}
