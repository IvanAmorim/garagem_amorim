"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import imageCompression from "browser-image-compression"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RotateCw, Scissors, X, Loader2, GripHorizontal } from "lucide-react"

interface ImageCropperProps {
  imageSrc: string
  fileName: string
  onConfirm: (file: File) => void
  onCancel: () => void
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => rej(new Error("Erro ao carregar imagem"))
    img.src = src
  })
}

async function rotateSrc(src: string): Promise<string> {
  const img = await loadImg(src)
  const c = document.createElement("canvas")
  c.width = img.naturalHeight
  c.height = img.naturalWidth
  const ctx = c.getContext("2d")!
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
  return new Promise<string>(res =>
    c.toBlob(b => res(URL.createObjectURL(b!)), "image/jpeg", 0.92)
  )
}

async function cropAndCompress(
  src: string,
  topPct: number,
  bottomPct: number,
  fileName: string,
): Promise<File> {
  const img = await loadImg(src)
  const startY = Math.round(img.naturalHeight * topPct / 100)
  const endY   = Math.round(img.naturalHeight * (1 - bottomPct / 100))
  const cropH  = Math.max(10, endY - startY)

  const c = document.createElement("canvas")
  c.width = img.naturalWidth
  c.height = cropH
  c.getContext("2d")!.drawImage(img, 0, startY, img.naturalWidth, cropH, 0, 0, img.naturalWidth, cropH)

  const blob = await new Promise<Blob>((res, rej) =>
    c.toBlob(b => b ? res(b) : rej(new Error("toBlob falhou")), "image/jpeg", 0.92)
  )
  const raw = new File([blob], fileName.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
  const compressed = await imageCompression(raw, {
    maxWidthOrHeight: 1400,
    initialQuality: 0.75,
    useWebWorker: true,
  })
  return new File([compressed], raw.name, { type: "image/jpeg" })
}

// ─── component ────────────────────────────────────────────────────────────────

export function ImageCropper({ imageSrc, fileName, onConfirm, onCancel }: ImageCropperProps) {
  const [previewSrc, setPreviewSrc] = useState(imageSrc)
  const [imgAspect, setImgAspect]   = useState<number | null>(null)
  const [topPct, setTopPct]         = useState(0)      // % cut from top  (0-50)
  const [bottomPct, setBottomPct]   = useState(0)      // % cut from bottom (0-50)
  const [dragging, setDragging]     = useState<"top" | "bottom" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRotating, setIsRotating]     = useState(false)

  // Extra blob URLs created for rotated previews — revoke on unmount
  const blobUrlsRef = useRef<string[]>([])
  useEffect(() => {
    const urls = blobUrlsRef.current
    return () => urls.forEach(URL.revokeObjectURL)
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)

  // When image loads (initial or after rotate), grab its aspect ratio
  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    if (w && h) setImgAspect(w / h)
  }, [])

  // ── drag logic ──────────────────────────────────────────────────────────────
  // Convert pointer Y (page coords) → percentage of image height
  const pctFromClientY = useCallback((clientY: number) => {
    const el = containerRef.current
    if (!el) return 0
    const { top, height } = el.getBoundingClientRect()
    return ((clientY - top) / height) * 100
  }, [])

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: PointerEvent) => {
      e.preventDefault()
      const pct = pctFromClientY(e.clientY)
      if (dragging === "top") {
        setTopPct(Math.max(0, Math.min(49, pct)))
      } else {
        setBottomPct(Math.max(0, Math.min(49, 100 - pct)))
      }
    }
    const onUp = () => setDragging(null)

    document.addEventListener("pointermove", onMove, { passive: false })
    document.addEventListener("pointerup", onUp)
    return () => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
    }
  }, [dragging, pctFromClientY])

  // ── rotate ──────────────────────────────────────────────────────────────────
  const handleRotate = async () => {
    setIsRotating(true)
    try {
      const url = await rotateSrc(previewSrc)
      blobUrlsRef.current.push(url)
      setPreviewSrc(url)
      setTopPct(0)
      setBottomPct(0)
    } finally {
      setIsRotating(false)
    }
  }

  // ── confirm ─────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      const file = await cropAndCompress(previewSrc, topPct, bottomPct, fileName)
      onConfirm(file)
    } catch {
      onCancel()
    } finally {
      setIsProcessing(false)
    }
  }

  const busy = isProcessing || isRotating

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={open => !open && !busy && onCancel()}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-base">Recortar Imagem</DialogTitle>
        </DialogHeader>

        <p className="px-4 pt-1 pb-3 text-xs text-muted-foreground">
          Arraste as barras brancas para definir o que fica. A zona escura é cortada.
        </p>

        {/* ── image + crop overlay ─────────────────────────────────────────── */}
        <div className="px-4">
          <div
            ref={containerRef}
            className="relative mx-auto overflow-hidden rounded-md bg-black select-none"
            style={{
              // Container matches image aspect ratio → no letterbox → handles always on the image
              aspectRatio: imgAspect ? String(imgAspect) : undefined,
              maxHeight: "min(58vh, 520px)",
              maxWidth: "100%",
              // Cursor while dragging
              cursor: dragging ? "ns-resize" : "default",
            }}
          >
            <img
              src={previewSrc}
              alt="preview"
              onLoad={onImgLoad}
              draggable={false}
              className="block w-full h-full object-cover pointer-events-none"
            />

            {/* Dark overlay — TOP cut area */}
            {topPct > 0 && (
              <div
                className="absolute inset-x-0 top-0 bg-black/65 pointer-events-none"
                style={{ height: `${topPct}%` }}
              />
            )}

            {/* Dark overlay — BOTTOM cut area */}
            {bottomPct > 0 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-black/65 pointer-events-none"
                style={{ height: `${bottomPct}%` }}
              />
            )}

            {/* ── TOP handle ───────────────────────────────────────────────── */}
            <Handle
              pct={topPct}
              position="top"
              onStart={() => setDragging("top")}
              label={topPct > 0 ? `${topPct.toFixed(0)}% cortado` : undefined}
            />

            {/* ── BOTTOM handle ─────────────────────────────────────────────── */}
            <Handle
              pct={bottomPct}
              position="bottom"
              onStart={() => setDragging("bottom")}
              label={bottomPct > 0 ? `${bottomPct.toFixed(0)}% cortado` : undefined}
            />
          </div>
        </div>

        {/* ── buttons ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              disabled={busy}
            >
              {isRotating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              Rodar 90°
            </Button>

            <Button size="sm" onClick={handleConfirm} disabled={busy}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4" />
                  Enviar para OCR
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Handle subcomponent ──────────────────────────────────────────────────────

function Handle({
  pct,
  position,
  onStart,
  label,
}: {
  pct: number
  position: "top" | "bottom"
  onStart: () => void
  label?: string
}) {
  const style: React.CSSProperties =
    position === "top"
      ? { top: `calc(${pct}% - 20px)` }
      : { bottom: `calc(${pct}% - 20px)` }

  return (
    <div
      className="absolute inset-x-0 h-10 flex items-center z-20 cursor-ns-resize touch-none"
      style={style}
      onPointerDown={e => {
        e.preventDefault()
        e.stopPropagation() // prevent Radix Dialog from capturing the pointer
        onStart()
      }}
    >
      {/* Full-width line */}
      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/90 -translate-y-1/2" />
      {/* Centre grip pill */}
      <div className="relative mx-auto flex items-center gap-1 bg-white rounded-full px-3 py-1 shadow-md">
        <GripHorizontal className="h-4 w-4 text-gray-500" />
        {label && <span className="text-xs font-medium text-gray-600 leading-none">{label}</span>}
      </div>
    </div>
  )
}
