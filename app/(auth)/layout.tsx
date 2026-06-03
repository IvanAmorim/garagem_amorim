import { Wrench } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3 text-primary-foreground">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wrench className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Oficina</h1>
              <p className="text-sm text-white/70">Sistema de Gestão</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {children}
        </div>
        <p className="text-center text-xs text-white/50 mt-6">
          © {new Date().getFullYear()} Oficina Mecânica. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
