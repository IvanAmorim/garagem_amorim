import { getDashboardStats } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Car,
  FileText,
  CheckCircle,
  Wrench,
  AlertTriangle,
  PackageX,
  TrendingUp,
  Calendar,
} from "lucide-react"
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Dashboard" }

function KpiCard({
  title,
  value,
  icon: Icon,
  href,
  variant = "default",
  subtitle,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  href?: string
  variant?: "default" | "warning" | "danger" | "success"
  subtitle?: string
}) {
  const colors = {
    default: "text-primary bg-primary/10",
    warning: "text-warning bg-warning/10",
    danger: "text-destructive bg-destructive/10",
    success: "text-success bg-success/10",
  }

  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-lg ${colors[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) return <Link href={href}>{content}</Link>
  return content
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da oficina</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiCard
          title="Clientes Ativos"
          value={stats.totalCustomers}
          icon={Users}
          href="/clientes"
        />
        <KpiCard
          title="Veículos"
          value={stats.totalVehicles}
          icon={Car}
          href="/veiculos"
        />
        <KpiCard
          title="Orçamentos Pendentes"
          value={stats.pendingQuotes}
          icon={FileText}
          href="/orcamentos?status=SENT"
          variant={stats.pendingQuotes > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Orçamentos Aprovados"
          value={stats.approvedQuotes}
          icon={CheckCircle}
          href="/orcamentos?status=APPROVED"
          variant={stats.approvedQuotes > 0 ? "success" : "default"}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiCard
          title="Serviços este Mês"
          value={stats.activeServices}
          icon={Wrench}
          href="/manutencoes"
        />
        <KpiCard
          title="Stock Baixo"
          value={stats.lowStockItems}
          icon={AlertTriangle}
          href="/stock?status=LOW"
          variant={stats.lowStockItems > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Stock Esgotado"
          value={stats.outOfStockItems}
          icon={PackageX}
          href="/stock?status=OUT_OF_STOCK"
          variant={stats.outOfStockItems > 0 ? "danger" : "default"}
        />
        <KpiCard
          title="Total Mês"
          value={formatCurrency(stats.monthlyTotal)}
          icon={TrendingUp}
          variant="success"
          subtitle="Orçamentos aprovados"
        />
      </div>

      {/* Recent Maintenance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Últimas Manutenções</CardTitle>
            <Link href="/manutencoes" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentMaintenance.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sem manutenções registadas
            </div>
          ) : (
            <div className="divide-y">
              {stats.recentMaintenance.map((record) => (
                <div key={record.id} className="flex items-start gap-3 p-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Wrench className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium truncate">{record.customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.vehicle.brand} {record.vehicle.model} · {record.vehicle.plate}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {record.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(record.date)}
                        </div>
                        {record.quote && (
                          <Badge variant="outline" className="text-xs">
                            {record.quote.number}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
