"use client"

import { useState, useCallback, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Upload, Loader2, AlertCircle, FileImage, Scissors, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ImageCropper } from "./image-cropper"

interface InvoiceUploadSectionProps {
  defaultQuoteId?: string
}

type Step = "idle" | "cropping" | "processing"

export function InvoiceUploadSection({ defaultQuoteId }: InvoiceUploadSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>("idle")
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)
  const [invoiceRef, setInvoiceRef] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const openCropper = (file: File) => {
    const url = URL.createObjectURL(file)
    setPendingFile(file)
    setPendingImageSrc(url)
    setStep("cropping")
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    if (file.type === "application/pdf") {
      toast({
        title: "PDF não suportado",
        description: "PDF ainda não suportado. Tire foto ou envie imagem JPG, PNG ou WEBP.",
        variant: "destructive",
      })
      return
    }
    openCropper(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 30 * 1024 * 1024,
    multiple: false,
  })

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset so the same file can be selected again if needed
    e.target.value = ""
    openCropper(file)
  }

  const handleCropConfirm = (croppedFile: File) => {
    // Release the object URL now that crop is done
    if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc)
    setPendingImageSrc(null)
    setStep("processing")

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("file", croppedFile)
        if (defaultQuoteId) formData.append("quoteId", defaultQuoteId)
        if (invoiceRef.trim()) formData.append("invoiceRef", invoiceRef.trim())
        if (invoiceDate) formData.append("invoiceDate", invoiceDate)

        const response = await fetch("/api/ocr/invoice", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error ?? "Erro no processamento")
        }

        const result = await response.json()
        const suspect = result.suspectCount > 0 ? ` (${result.suspectCount} a rever)` : ""
        toast({
          title: "Fatura processada",
          description: `${result.itemCount} artigo(s) extraído(s)${suspect}. Classifique-os abaixo.`,
        })
        setPendingFile(null)
        setInvoiceRef("")
        setInvoiceDate("")
        router.refresh()
      } catch (err) {
        toast({
          title: "Erro ao processar fatura",
          description: err instanceof Error ? err.message : "Tente novamente",
          variant: "destructive",
        })
      } finally {
        setStep("idle")
      }
    })
  }

  const handleCropCancel = () => {
    if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc)
    setPendingFile(null)
    setPendingImageSrc(null)
    setStep("idle")
  }

  return (
    <>
      {/* Cropper Dialog — mounted only when needed */}
      {step === "cropping" && pendingImageSrc && pendingFile && (
        <ImageCropper
          imageSrc={pendingImageSrc}
          fileName={pendingFile.name}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload de Fatura de Material
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Invoice metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nº Fatura / Guia de Separação</Label>
              <Input
                placeholder="Ex: FT 2024/1234"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                className="h-8 text-sm"
                disabled={step === "processing"}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data de Compra</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-8 text-sm"
                disabled={step === "processing"}
              />
            </div>
          </div>

          {/* Hidden camera input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />

          {step === "processing" || isPending ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">A extrair artigos com OCR...</p>
              <p className="text-xs text-muted-foreground mt-1">Pode demorar alguns segundos</p>
            </div>
          ) : (
            <>
              {/* Camera button — prominent on mobile */}
              <Button
                variant="outline"
                className="w-full h-14 text-sm gap-2 border-primary/40 text-primary hover:bg-primary/5"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-5 w-5" />
                Tirar Foto
              </Button>

              <div className="relative flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Dropzone for file selection */}
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <input {...getInputProps()} />
                {isDragActive ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <FileImage className="h-7 w-7 text-primary" />
                    <p className="text-sm">Largue o ficheiro aqui</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <Upload className="h-7 w-7 text-muted-foreground" />
                    <p className="text-sm font-medium">Selecionar ficheiro</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WEBP</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <Scissors className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Será aberto um recortador antes do envio para OCR</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              O nº de fatura e data de compra ficam associados às peças para consulta de garantia.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
