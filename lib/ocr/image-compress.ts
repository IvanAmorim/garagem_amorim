import sharp from "sharp"

const MAX_WIDTH = 1600
const JPEG_QUALITY = 82

export async function compressInvoiceImage(file: File): Promise<{ buffer: Buffer; mimeType: string }> {
  const input = Buffer.from(await file.arrayBuffer())

  const compressed = await sharp(input)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, progressive: true })
    .toBuffer()

  return { buffer: compressed, mimeType: "image/jpeg" }
}
