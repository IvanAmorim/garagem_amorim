import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/toaster"

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Oficina Mecânica",
    template: "%s | Oficina Mecânica",
  },
  description: "Sistema de gestão para oficina mecânica",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" className={`${geist.variable} h-full`}>
      <body className="h-full antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
