import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Header } from "@/components/layout/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
