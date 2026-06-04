import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { openAiOcrExtract } from "@/lib/ocr/openai-invoice-ocr"
import { compressInvoiceImage } from "@/lib/ocr/image-compress"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const quoteId = formData.get("quoteId") as string | null
    const invoiceRef = formData.get("invoiceRef") as string | null
    const invoiceDate = formData.get("invoiceDate") as string | null

    if (!file) {
      return NextResponse.json({ error: "Ficheiro obrigatório" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de ficheiro não suportado. Usa JPG, PNG ou WEBP." }, { status: 400 })
    }

    const maxSize = 15 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Ficheiro demasiado grande. Máximo 15MB." }, { status: 400 })
    }

    // Compress and resize before sending to OpenAI
    const { buffer, mimeType } = await compressInvoiceImage(file)

    // Extract items via OCR
    const ocrResult = await openAiOcrExtract(buffer, mimeType)

    const documentUrl = `/uploads/${Date.now()}-${file.name}`

    const uploadedDoc = await db.uploadedDocument.create({
      data: {
        name: file.name,
        url: documentUrl,
        mimeType: file.type,
        size: file.size,
        quoteId: quoteId || null,
        invoiceRef: invoiceRef || ocrResult.documentNumber || null,
        invoiceDate: invoiceDate
          ? new Date(invoiceDate)
          : ocrResult.documentDate
            ? new Date(ocrResult.documentDate)
            : null,
      },
    })

    await db.extractedInvoiceItem.createMany({
      data: ocrResult.items.map((item) => ({
        uploadedDocumentId: uploadedDoc.id,
        description: item.description,
        reference: item.reference,
        quantity: item.quantity,
        unitPrice: item.unitPriceBeforeDiscount,
        supplierDiscountPct: item.supplierDiscountPct,
        purchaseUnitPrice: item.purchaseUnitPrice,
        taxRate: item.taxRate,
        total: item.lineTotalAfterDiscount,
        needsReview: item.needsReview,
        reviewReason: item.reviewReason,
        status: "UNASSIGNED",
      })),
    })

    const suspectCount = ocrResult.items.filter((i) => i.needsReview).length

    return NextResponse.json({
      success: true,
      documentId: uploadedDoc.id,
      itemCount: ocrResult.items.length,
      suspectCount,
      items: ocrResult.items.map((item) => ({
        description: item.description,
        reference: item.reference,
        quantity: item.quantity,
        unitPrice: item.unitPriceBeforeDiscount,
        supplierDiscountPct: item.supplierDiscountPct,
        purchaseUnitPrice: item.purchaseUnitPrice,
        taxRate: item.taxRate,
        total: item.lineTotalAfterDiscount,
        needsReview: item.needsReview,
        reviewReason: item.reviewReason,
      })),
    })
  } catch (error) {
    console.error("OCR error:", error)
    return NextResponse.json({ error: "Erro ao processar fatura" }, { status: 500 })
  }
}
