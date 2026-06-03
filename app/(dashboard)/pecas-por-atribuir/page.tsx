import { getAllExtractedItems } from "@/app/actions/ocr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Scan, Upload } from "lucide-react"
import type { Metadata } from "next"
import { InvoiceUploadSection } from "@/components/ocr/invoice-upload-section"
import { ExtractedItemsTable } from "@/components/ocr/extracted-items-table"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Peças por Atribuir" }

export default async function PecasPorAtribuirPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; quoteId?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { status, quoteId } = await searchParams

  const [items, customers, vehicles, quotes, maintenanceRecords] = await Promise.all([
    getAllExtractedItems(status),
    db.customer.findMany({ select: { id: true, name: true }, where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.vehicle.findMany({ select: { id: true, plate: true, brand: true, model: true, customerId: true }, orderBy: { plate: "asc" } }),
    db.quote.findMany({ select: { id: true, number: true, customerId: true, vehicleId: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.maintenanceRecord.findMany({ select: { id: true, description: true, date: true, vehicleId: true, customerId: true }, orderBy: { date: "desc" }, take: 50 }),
  ])

  const unassignedCount = items.filter((i) => i.status === "UNASSIGNED").length

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Peças por Atribuir</h1>
          <p className="text-sm text-muted-foreground">
            Classifique as peças extraídas de faturas e associe-as aos serviços
          </p>
        </div>
        {unassignedCount > 0 && (
          <Badge variant="warning" className="flex-shrink-0">
            {unassignedCount} por atribuir
          </Badge>
        )}
      </div>

      {/* Upload section */}
      <InvoiceUploadSection defaultQuoteId={quoteId} />

      {/* Items table */}
      {items.length > 0 ? (
        <ExtractedItemsTable
          items={items.map((item) => ({
            id: item.id,
            uploadedDocumentId: item.uploadedDocumentId,
            description: item.description,
            reference: item.reference,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            taxRate: item.taxRate ? Number(item.taxRate) : null,
            total: Number(item.total),
            status: item.status,
            customerId: item.customerId,
            vehicleId: item.vehicleId,
            quoteId: item.quoteId,
            maintenanceRecordId: item.maintenanceRecordId,
            customer: item.customer,
            vehicle: item.vehicle,
            quote: item.quote,
            maintenanceRecord: item.maintenanceRecord,
            uploadedDocument: { name: item.uploadedDocument.name, uploadedAt: item.uploadedDocument.uploadedAt },
          }))}
          customers={customers}
          vehicles={vehicles}
          quotes={quotes}
          maintenanceRecords={maintenanceRecords.map((m) => ({
            id: m.id,
            description: m.description.slice(0, 60),
            date: m.date,
            vehicleId: m.vehicleId,
            customerId: m.customerId,
          }))}
          currentStatus={status}
        />
      ) : (
        <Card className="p-12 text-center">
          <Scan className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Sem peças extraídas</p>
          <p className="text-sm text-muted-foreground mt-1">
            Faça upload de uma fatura para extrair as peças automaticamente
          </p>
        </Card>
      )}
    </div>
  )
}
