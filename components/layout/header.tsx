"use client"

import { signOut, useSession } from "next-auth/react"
import { User, LogOut, Settings, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {title && <h1 className="text-base font-semibold">{title}</h1>}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="rounded-full">
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-foreground">
                    {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{session?.user?.name ?? "Utilizador"}</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/configuracoes" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
