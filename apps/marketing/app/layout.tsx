import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

export const metadata: Metadata = {
  title: "Weave - AI-Powered TTRPG Campaign Management",
  description:
    "Streamline your RPG campaigns with relationship-first AI that keeps context of your world, characters, and stories interconnected.",
  generator: "v0.app",
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <style>{`
html {
  font-family: ${geistSans.style.fontFamily};
  --font-sans: ${geistSans.variable};
  --font-mono: ${geistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
