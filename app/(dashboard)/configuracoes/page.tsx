import { getWorkshopSettings } from "@/app/actions/settings"
import { SettingsForm } from "@/components/configuracoes/settings-form"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Configurações" }

export default async function ConfiguracoesPage() {
  const settings = await getWorkshopSettings()

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dados da oficina e preferências do sistema</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
