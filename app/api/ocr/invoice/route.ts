import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

/**
 * OCR Invoice processing endpoint.
 * Currently uses mock data. Replace the `mockOcrExtract` function
 * with a real integration (OpenAI Vision, Google Vision, Azure OCR).
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const quoteId = formData.get("quoteId") as string | null

    if (!file) {
      return NextResponse.json({ error: "Ficheiro obrigatório" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de ficheiro não suportado" }, { status: 400 })
    }

    // Store the uploaded document reference
    // In production: upload to Vercel Blob / Supabase Storage and get URL
    const documentUrl = `/uploads/${Date.now()}-${file.name}`

    const uploadedDoc = await db.uploadedDocument.create({
      data: {
        name: file.name,
        url: documentUrl,
        mimeType: file.type,
        size: file.size,
        quoteId: quoteId || null,
      },
    })

    // Extract items via OCR service
    // In production: replace mockOcrExtract with real OCR call
    const extractedItems = await mockOcrExtract(file)

    // Save extracted items to database
    await db.extractedInvoiceItem.createMany({
      data: extractedItems.map((item) => ({
        uploadedDocumentId: uploadedDoc.id,
        description: item.description,
        reference: item.reference,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        total: item.total,
        status: "UNASSIGNED",
      })),
    })

    return NextResponse.json({
      success: true,
      documentId: uploadedDoc.id,
      itemCount: extractedItems.length,
      items: extractedItems,
    })
  } catch (error) {
    console.error("OCR error:", error)
    return NextResponse.json({ error: "Erro ao processar fatura" }, { status: 500 })
  }
}

/**
 * Mock OCR extraction - simulates AI/OCR output.
 * Replace this with a real OCR integration:
 *
 * OpenAI Vision:
 *   const response = await openai.chat.completions.create({
 *     model: "gpt-4o",
 *     messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: base64DataUrl } }, { type: "text", text: EXTRACTION_PROMPT }] }]
 *   })
 *
 * Google Vision:
 *   const [result] = await client.textDetection(imageBuffer)
 *   // parse result.textAnnotations
 *
 * Azure OCR:
 *   const result = await client.beginAnalyzeDocument("prebuilt-invoice", imageBuffer)
 */
async function mockOcrExtract(_file: File) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  return [
    {
      description: "Filtro de Óleo Bosch",
      reference: "BO-F-0987",
      quantity: 2,
      unitPrice: 12.5,
      taxRate: 23,
      total: 30.75,
    },
    {
      description: "Óleo Motor Castrol 5W-30 5L",
      reference: "CA-OIL-530",
      quantity: 3,
      unitPrice: 38.0,
      taxRate: 23,
      total: 140.22,
    },
    {
      description: "Pastilhas de Travão Dianteiras",
      reference: "PT-BR-001",
      quantity: 1,
      unitPrice: 45.0,
      taxRate: 23,
      total: 55.35,
    },
    {
      description: "Correia de Distribuição Kit",
      reference: "CD-KIT-123",
      quantity: 1,
      unitPrice: 89.9,
      taxRate: 23,
      total: 110.58,
    },
  ]
}
