import OpenAI from "openai"
import { z } from "zod"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// The model returns raw strings exactly as visible in the document.
// TypeScript then parses them — no decimal-format ambiguity.
const rawItemSchema = z.object({
  description: z.string(),
  reference: z.string().nullable(),
  quantityRaw: z.string(),
  unitPriceRaw: z.string(),
  discountRaw: z.string(),
  taxRateRaw: z.string(),
  lineTotalRaw: z.string(),
})

const rawOcrSchema = z.object({
  supplierName: z.string().nullable(),
  supplierNif: z.string().nullable(),
  documentNumber: z.string().nullable(),
  documentDate: z.string().nullable(),
  documentType: z.enum([
    "FATURA",
    "FATURA_RECIBO",
    "GUIA",
    "GUIA_SEPARACAO",
    "GUIA_TRANSPORTE",
    "OUTRO",
  ]),
  items: z.array(rawItemSchema),
})

export type OcrItem = {
  description: string
  reference: string | null
  quantity: number
  unitPriceBeforeDiscount: number
  supplierDiscountPct: number
  purchaseUnitPrice: number
  taxRate: number
  lineTotalBeforeDiscount: number
  lineTotalAfterDiscount: number
  needsReview: boolean
  reviewReason: string | null
}

export type InvoiceOcrResult = {
  supplierName: string | null
  supplierNif: string | null
  documentNumber: string | null
  documentDate: string | null
  documentType: z.infer<typeof rawOcrSchema>["documentType"]
  items: OcrItem[]
}

/**
 * Parse Portuguese decimal format to a JS number.
 * "1,00" → 1   |  "52,866" → 52.866  |  "1.234,56" → 1234.56  |  "31,72" → 31.72
 */
function parseNum(raw: string): number {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return 0
  const s = raw.trim()
  // If both . and , exist: . is thousands separator, , is decimal → "1.234,56"
  if (s.includes(".") && s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."))
  }
  // Only comma: decimal separator → "52,866" → 52.866
  if (s.includes(",")) {
    return parseFloat(s.replace(",", "."))
  }
  // Only dot or plain integer
  return parseFloat(s)
}

const PROMPT = `
You are extracting data from a Portuguese auto-parts supplier document (Guia de Separação, Fatura, etc).

CRITICAL — return ONLY the JSON described below. No extra text.

For every numeric field, copy the EXACT string visible in the document — do NOT convert, do NOT remove commas, do NOT do arithmetic. Examples of valid raw values: "1,00", "52,866", "31,72", "40", "23", "0".

COLUMN MAPPING (use ONLY these columns — do not mix values between columns):
  quantityRaw       ← column "Quant."      (copy the cell as-is, e.g. "1,00" "2,00")
  unitPriceRaw      ← column "Prec Unit."  (copy the cell as-is, e.g. "52,866")
  discountRaw       ← column "Desc"        (percentage as-is, e.g. "40" or "0" if empty)
  taxRateRaw        ← column "Iva"         (e.g. "23" — use "23" if not visible)
  lineTotalRaw      ← column "Valor Liq."  (copy the cell as-is, e.g. "31,72")

HEADER:
  documentNumber ← field "Número"
  documentDate   ← field "Data" in YYYY-MM-DD format
  supplierName   ← company name of the supplier (NOT "Atendido por" / attendant name)
  documentType:
    GUIA_SEPARACAO  if title contains "GUIA" and "SEPARAÇÃO"
    GUIA_TRANSPORTE if title contains "GUIA" and "TRANSPORTE"
    GUIA            if title contains "GUIA" only
    FATURA_RECIBO   if title contains "FATURA-RECIBO"
    FATURA          if title contains "FATURA"
    OUTRO           otherwise

RULES:
  - Include ALL product lines from the table.
  - Exclude lines that are totals, shipping, administrative fees, or have no part reference.
  - Do NOT compute anything — copy raw strings only.
  - Do NOT put a price value in discountRaw — it must be a percentage (e.g. "40", not "21,146").
  - Do NOT copy the same value from lineTotalRaw into unitPriceRaw.
`.trim()

function validateAndFixItem(
  raw: z.infer<typeof rawItemSchema>,
  index: number
): OcrItem {
  const reasons: string[] = []

  const quantity = parseNum(raw.quantityRaw)
  const unitPriceBeforeDiscount = parseNum(raw.unitPriceRaw)
  const supplierDiscountPct = parseNum(raw.discountRaw)
  const taxRate = parseNum(raw.taxRateRaw) || 23
  const lineTotalAfterDiscount = parseNum(raw.lineTotalRaw)

  // Derive purchaseUnitPrice from the total (most reliable cell)
  let purchaseUnitPrice = quantity > 0 ? lineTotalAfterDiscount / quantity : unitPriceBeforeDiscount

  // Cross-check with discount: expected = unitPrice * (1 - discount/100)
  if (supplierDiscountPct > 0 && unitPriceBeforeDiscount > 0) {
    const expectedFromDiscount = unitPriceBeforeDiscount * (1 - supplierDiscountPct / 100)
    if (Math.abs(purchaseUnitPrice - expectedFromDiscount) > 0.02) {
      reasons.push(
        `Custo calculado ${purchaseUnitPrice.toFixed(3)} vs esperado por desconto ${expectedFromDiscount.toFixed(3)}`
      )
    }
  }

  const lineTotalBeforeDiscount = quantity * unitPriceBeforeDiscount

  // Suspicious: quantity > 20 for a parts invoice
  if (quantity > 20) {
    reasons.push(`Qtd suspeita: ${quantity} (raw: "${raw.quantityRaw}") — confirmar`)
  }

  // Suspicious: quantity = 0 (parse failed)
  if (quantity === 0) {
    reasons.push(`Qtd = 0 (raw: "${raw.quantityRaw}") — parse falhou`)
  }

  // Suspicious: purchaseUnitPrice > unitPriceBeforeDiscount with a discount
  if (supplierDiscountPct > 0 && purchaseUnitPrice > unitPriceBeforeDiscount * 1.001) {
    reasons.push(
      `Custo ${purchaseUnitPrice.toFixed(3)} > lista ${unitPriceBeforeDiscount} com desc ${supplierDiscountPct}%`
    )
  }

  // Suspicious: discount percentage looks like it might actually be a price (> 100)
  if (supplierDiscountPct > 100) {
    reasons.push(`Desc ${supplierDiscountPct}% > 100 — pode ter sido lido da coluna errada (raw: "${raw.discountRaw}")`)
  }

  return {
    description: raw.description,
    reference: raw.reference,
    quantity,
    unitPriceBeforeDiscount,
    supplierDiscountPct,
    purchaseUnitPrice,
    taxRate,
    lineTotalBeforeDiscount,
    lineTotalAfterDiscount,
    needsReview: reasons.length > 0,
    reviewReason: reasons.length > 0 ? `[linha ${index + 1}] ${reasons.join(" | ")}` : null,
  }
}

export async function openAiOcrExtract(buffer: Buffer, mimeType: string): Promise<InvoiceOcrResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada")
  }

  const base64 = buffer.toString("base64")

  const response = await openai.responses.create({
    model: "gpt-4o",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: PROMPT },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${base64}`,
            detail: "high",
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "invoice_ocr",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            supplierName: { type: ["string", "null"] },
            supplierNif: { type: ["string", "null"] },
            documentNumber: { type: ["string", "null"] },
            documentDate: { type: ["string", "null"] },
            documentType: {
              type: "string",
              enum: ["FATURA", "FATURA_RECIBO", "GUIA", "GUIA_SEPARACAO", "GUIA_TRANSPORTE", "OUTRO"],
            },
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  description: { type: "string" },
                  reference: { type: ["string", "null"] },
                  quantityRaw: { type: "string" },
                  unitPriceRaw: { type: "string" },
                  discountRaw: { type: "string" },
                  taxRateRaw: { type: "string" },
                  lineTotalRaw: { type: "string" },
                },
                required: ["description", "reference", "quantityRaw", "unitPriceRaw", "discountRaw", "taxRateRaw", "lineTotalRaw"],
              },
            },
          },
          required: ["supplierName", "supplierNif", "documentNumber", "documentDate", "documentType", "items"],
        },
      },
    },
  })

  const json = JSON.parse(response.output_text)
  const parsed = rawOcrSchema.parse(json)

  return {
    ...parsed,
    items: parsed.items.map((item, i) => validateAndFixItem(item, i)),
  }
}
