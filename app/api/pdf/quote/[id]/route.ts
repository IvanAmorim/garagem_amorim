import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { pt } from "date-fns/locale"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await params

  const [quote, settings] = await Promise.all([
    db.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        items: true,
        laborItems: true,
      },
    }),
    db.workshopSettings.findFirst(),
  ])

  if (!quote) {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 })
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  const formatNum = (n: number | string | unknown) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(n))

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, pageWidth, 35, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text(settings?.name ?? "Oficina Mecânica", margin, 14)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  if (settings?.address) doc.text(settings.address, margin, 21)
  if (settings?.nif) doc.text(`NIF: ${settings.nif}`, margin, 27)
  if (settings?.phone) doc.text(settings.phone, margin, 33)

  // Quote number
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(`ORÇAMENTO`, pageWidth - margin, 14, { align: "right" })
  doc.setFontSize(11)
  doc.text(quote.number, pageWidth - margin, 22, { align: "right" })

  // ── Customer & Vehicle ───────────────────────────────────────────────────
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("CLIENTE", margin, 46)
  doc.setTextColor(60, 60, 60)
  doc.setFont("helvetica", "normal")
  doc.text(quote.customer.name, margin, 52)
  if (quote.customer.nif) doc.text(`NIF: ${quote.customer.nif}`, margin, 57)
  if (quote.customer.address) doc.text(quote.customer.address, margin, 62)
  if (quote.customer.phone) doc.text(quote.customer.phone, margin, 67)

  if (quote.vehicle) {
    doc.setTextColor(30, 58, 95)
    doc.setFont("helvetica", "bold")
    doc.text("VEÍCULO", pageWidth / 2, 46)
    doc.setTextColor(60, 60, 60)
    doc.setFont("helvetica", "normal")
    doc.text(quote.vehicle.plate, pageWidth / 2, 52)
    doc.text(`${quote.vehicle.brand} ${quote.vehicle.model}`, pageWidth / 2, 57)
    if (quote.vehicle.year) doc.text(`Ano: ${quote.vehicle.year}`, pageWidth / 2, 62)
  }

  // Date
  doc.setTextColor(30, 58, 95)
  doc.setFont("helvetica", "bold")
  doc.text("DATA", pageWidth - margin - 30, 46)
  doc.setTextColor(60, 60, 60)
  doc.setFont("helvetica", "normal")
  doc.text(format(quote.createdAt, "dd/MM/yyyy", { locale: pt }), pageWidth - margin - 30, 52)
  if (quote.validUntil) {
    doc.text("VÁLIDO ATÉ", pageWidth - margin - 30, 58)
    doc.text(format(quote.validUntil, "dd/MM/yyyy", { locale: pt }), pageWidth - margin - 30, 63)
  }

  // ── Materials Table ──────────────────────────────────────────────────────
  let currentY = 80

  if (quote.items.length > 0) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(30, 58, 95)
    doc.text("MATERIAIS", margin, currentY)
    currentY += 3

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["Descrição", "Ref.", "Qtd.", "P. Unit.", "IVA", "Total"]],
      body: quote.items.map((item) => [
        item.description,
        item.reference ?? "",
        String(Number(item.quantity)),
        formatNum(item.unitPrice),
        `${Number(item.taxRate)}%`,
        formatNum(item.total),
      ]),
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
      theme: "striped",
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })

    currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // ── Labor Table ──────────────────────────────────────────────────────────
  if (quote.laborItems.length > 0) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(30, 58, 95)
    doc.text("MÃO DE OBRA", margin, currentY)
    currentY += 3

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["Descrição", "Horas", "Valor/Hora", "Total"]],
      body: quote.laborItems.map((item) => [
        item.description,
        `${Number(item.hours)}h`,
        formatNum(item.hourRate),
        formatNum(item.total),
      ]),
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      theme: "striped",
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })

    currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalsX = pageWidth - margin - 70
  const valueX = pageWidth - margin

  const laborTotal = quote.laborItems.reduce((acc, i) => acc + Number(i.total), 0)
  const itemsSubtotal = quote.items.reduce((acc, i) => acc + Number(i.quantity) * Number(i.unitPrice), 0)
  const itemsTax = quote.items.reduce((acc, i) => acc + Number(i.quantity) * Number(i.unitPrice) * (Number(i.taxRate) / 100), 0)
  const discount = Number(quote.discount)

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.setFont("helvetica", "normal")

  doc.text("Subtotal Materiais:", totalsX, currentY)
  doc.text(formatNum(itemsSubtotal), valueX, currentY, { align: "right" })
  currentY += 5

  doc.text("Mão de Obra:", totalsX, currentY)
  doc.text(formatNum(laborTotal), valueX, currentY, { align: "right" })
  currentY += 5

  if (discount > 0) {
    doc.setTextColor(200, 0, 0)
    doc.text("Desconto:", totalsX, currentY)
    doc.text(`-${formatNum(discount)}`, valueX, currentY, { align: "right" })
    doc.setTextColor(100, 100, 100)
    currentY += 5
  }

  doc.text("IVA:", totalsX, currentY)
  doc.text(formatNum(itemsTax), valueX, currentY, { align: "right" })
  currentY += 2

  doc.setDrawColor(30, 58, 95)
  doc.line(totalsX, currentY, valueX, currentY)
  currentY += 5

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 58, 95)
  doc.text("TOTAL:", totalsX, currentY)
  doc.text(formatNum(Number(quote.total)), valueX, currentY, { align: "right" })
  currentY += 10

  // ── Notes & Terms ────────────────────────────────────────────────────────
  if (quote.notes) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(30, 58, 95)
    doc.text("Observações:", margin, currentY)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80, 80, 80)
    const lines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2)
    doc.text(lines, margin, currentY + 5)
    currentY += lines.length * 4 + 10
  }

  if (quote.terms) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(30, 58, 95)
    doc.text("Condições Comerciais:", margin, currentY)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80, 80, 80)
    const lines = doc.splitTextToSize(quote.terms, pageWidth - margin * 2)
    doc.text(lines, margin, currentY + 5)
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.setFont("helvetica", "normal")
  doc.text(
    `${settings?.name ?? "Oficina Mecânica"} · ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  )

  const pdfBuffer = doc.output("arraybuffer")

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orcamento-${quote.number}.pdf"`,
    },
  })
}
