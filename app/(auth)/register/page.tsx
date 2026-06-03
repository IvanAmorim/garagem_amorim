"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { registerUser } from "@/app/actions/auth"

export default function RegisterPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const result = await registerUser({
        name: form.get("name") as string,
        email: form.get("email") as string,
        password: form.get("password") as string,
        role: "MECHANIC",
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push("/login")
    })
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Criar Conta</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Registe-se para aceder à plataforma
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" placeholder="João Silva" required minLength={2} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="email@exemplo.com" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              A criar conta...
            </>
          ) : (
            "Criar Conta"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
