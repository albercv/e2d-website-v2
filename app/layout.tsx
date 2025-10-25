import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import { PreloadResources } from "@/components/performance/preload-resources"
import { GoogleAnalytics } from "@/components/analytics/google-analytics"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "E2D - Evolve2Digital | Automatiza tu PYME",
  description:
    "Automatiza tu pyme: más ventas, menos tareas. Agentes de voz, chatbots WhatsApp y automatizaciones para clínicas, inmobiliarias y asesorías.",
  generator: "E2D - Evolve2Digital",
  keywords: ["automatización", "chatbots", "WhatsApp", "voicebots", "PYME", "clínicas", "inmobiliarias"],
  authors: [{ name: "Alberto Carrasco", url: "https://evolve2digital.com" }],
  creator: "E2D - Evolve2Digital",
  publisher: "E2D - Evolve2Digital",
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: "en_US",
    url: "https://evolve2digital.com",
    siteName: "E2D - Evolve2Digital",
    title: "E2D - Automatiza tu PYME con IA",
    description: "Automatiza tu pyme: más ventas, menos tareas. Agentes de voz, chatbots WhatsApp y automatizaciones.",
  },
  twitter: {
    card: "summary_large_image",
    title: "E2D - Automatiza tu PYME con IA",
    description: "Automatiza tu pyme: más ventas, menos tareas. Agentes de voz, chatbots WhatsApp y automatizaciones.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.evolve2digital.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        {/* Favicon & App Icons */}
        <link rel="icon" href="/e2dFavicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/e2d_logo.webp" />
      </head>
      <body className={`font-sans ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <PreloadResources />
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )}
