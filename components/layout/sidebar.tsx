"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Car,
  Package,
  FileText,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scan,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/veiculos", label: "Veículos", icon: Car },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/manutencoes", label: "Manutenções", icon: Wrench },
  { href: "/pecas-por-atribuir", label: "Peças por Atribuir", icon: Scan },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-primary text-primary-foreground transition-all duration-300 ease-in-out relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-white/10", collapsed && "justify-center")}>
        <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <Wrench className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-sm leading-tight">Oficina</p>
            <p className="text-xs text-white/70">Mecânica</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-accent"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  )
}
