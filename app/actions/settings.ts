"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { workshopSettingsSchema, type WorkshopSettingsInput } from "@/lib/validations"
import type { ActionResult } from "@/types"
import { auth } from "@/auth"

async function requireAuth() {
  const session = await auth()
  if (!session) throw new Error("Não autenticado")
  return session
}

export async function getWorkshopSettings() {
  await requireAuth()
  return db.workshopSettings.findFirst()
}

export async function upsertWorkshopSettings(data: WorkshopSettingsInput): Promise<ActionResult> {
  await requireAuth()
  const parsed = workshopSettingsSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: "Dados inválidos" }

  const existing = await db.workshopSettings.findFirst()

  if (existing) {
    await db.workshopSettings.update({
      where: { id: existing.id },
      data: parsed.data,
    })
  } else {
    await db.workshopSettings.create({ data: parsed.data })
  }

  revalidatePath("/configuracoes")
  return { success: true, data: undefined }
}
