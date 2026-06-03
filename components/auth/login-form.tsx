"use client"

import { useActionState } from "react"
import { loginUser } from "@/app/actions/auth"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginUser, {})
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Entrar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aceda à plataforma de gestão
        </p>
      </div>

      <form action={action} className="space-y-4">
        {state?.error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
            {state.error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="email@exemplo.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              required
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
              A entrar...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Sem conta?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Registar
        </Link>
      </p>
    </div>
  )
}
