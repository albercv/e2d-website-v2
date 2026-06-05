import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { PreloadResources } from "@/components/performance/preload-resources"
import { GoogleAnalytics } from "@/components/analytics/google-analytics"
import { ApolloTracker } from "@/components/analytics/apollo-tracker"

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
  title: "E2D - Evolve2Digital | Software a medida para PYMEs",
  description:
    "Desarrollo de software a medida, automatización de procesos e integraciones con IA para PYMEs de 10 a 50 empleados. Sin SaaS genérico: tu software, tu negocio.",
  generator: "E2D - Evolve2Digital",
  keywords: ["software a medida", "desarrollo a medida", "ERP a medida", "CRM personalizado", "automatización de procesos", "integración IA empresas", "software para PYMEs"],
  authors: [{ name: "Alberto Carrasco", url: "https://evolve2digital.com" }],
  creator: "E2D - Evolve2Digital",
  publisher: "E2D - Evolve2Digital",
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: "en_US",
    url: "https://evolve2digital.com",
    siteName: "E2D - Evolve2Digital",
    title: "E2D - Software a medida para PYMEs",
    description: "Desarrollo de software a medida, automatización de procesos e integraciones con IA para PYMEs de 10 a 50 empleados.",
  },
  twitter: {
    card: "summary_large_image",
    title: "E2D - Software a medida para PYMEs",
    description: "Desarrollo de software a medida, automatización de procesos e integraciones con IA para PYMEs de 10 a 50 empleados.",
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
<link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://assets.apollo.io" />
      </head>
      <body className={`font-sans ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <PreloadResources />
        <GoogleAnalytics />
        <ApolloTracker />
        {children}
      </body>
    </html>
  )}
