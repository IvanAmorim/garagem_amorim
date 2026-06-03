"use client"

import { useState, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Upload, Loader2, AlertCircle, CheckCircle, FileImage } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface InvoiceUploadSectionProps {
  defaultQuoteId?: string
}

export function InvoiceUploadSection({ defaultQuoteId }: InvoiceUploadSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setUploadedFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  })

  const handleProcess = () => {
    if (!uploadedFile) return
    setIsUploading(true)

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("file", uploadedFile)
        if (defaultQuoteId) formData.append("quoteId", defaultQuoteId)

        const response = await fetch("/api/ocr/invoice", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error ?? "Erro no processamento")
        }

        const result = await response.json()
        toast({
          title: "Fatura processada",
          description: `${result.itemCount} artigo(s) extraído(s). Classifique-os abaixo.`,
          variant: "default",
        })
        setUploadedFile(null)
        router.refresh()
      } catch (err) {
        toast({
          title: "Erro ao processar fatura",
          description: err instanceof Error ? err.message : "Tente novamente",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload de Fatura de Material
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : uploadedFile
              ? "border-success bg-success/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <input {...getInputProps()} />
          {uploadedFile ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8 text-success" />
              <p className="text-sm font-medium">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(uploadedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
          ) : isDragActive ? (
            <div className="flex flex-col items-center gap-2">
              <FileImage className="h-8 w-8 text-primary" />
              <p className="text-sm">Largue o ficheiro aqui</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, PDF até 10MB</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Os artigos extraídos ficarão para atribuição individual a serviços, orçamentos ou veículos.
          </p>
        </div>

        {uploadedFile && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadedFile(null)}
              disabled={isUploading}
            >
              Remover
            </Button>
            <Button size="sm" onClick={handleProcess} disabled={isUploading || isPending}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Extrair Artigos
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
