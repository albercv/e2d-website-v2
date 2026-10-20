import type React from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import { PreloadResources } from "@/components/performance/preload-resources"
import { GoogleAnalytics } from "@/components/analytics/google-analytics"
import { ApolloTracker } from "@/components/analytics/apollo-tracker"
import { OpenAIPixel } from "@/components/analytics/openai-pixel"

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

// El documento vive aquí y no en app/layout.tsx porque el `lang` solo se conoce
// en el layout de cada árbol de rutas: el HTML servido ya debe llevar el idioma
// correcto, sin depender de que el cliente lo corrija tras hidratar.
export function HtmlDocument({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html lang={lang} className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://assets.apollo.io" />
        <link rel="dns-prefetch" href="https://bzrcdn.openai.com" />
      </head>
      <body className={`font-sans ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <PreloadResources />
        <GoogleAnalytics />
        <ApolloTracker />
        <OpenAIPixel />
        {children}
      </body>
    </html>
  )
}
