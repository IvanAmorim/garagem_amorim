"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { registerSchema, type RegisterInput } from "@/lib/validations"
import type { ActionResult } from "@/types"
import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function registerUser(data: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos" }
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return { success: false, error: "Este email já está registado" }
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: parsed.data.role,
    },
  })

  return { success: true, data: undefined }
}

export async function loginUser(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/dashboard",
    })
    return {}
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email ou password incorretos." }
        default:
          return { error: "Erro ao iniciar sessão. Tente novamente." }
      }
    }
    throw error
  }
}
