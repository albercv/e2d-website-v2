import type React from "react"
import type { Metadata } from "next"
import { PERSON_NAME, PERSON_PROFILE_URL } from "@/lib/seo/entities"
import "./globals.css"

export const metadata: Metadata = {
  // Resuelve URLs relativas de OG/Twitter (ej. covers de blog `/uploads/...`) a
  // absolutas. Sin esto, Next prepende el host de build (localhost:PORT) y las
  // cards sociales apuntan a http://localhost:3003/... en producción.
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://evolve2digital.com"),
  title: "E2D - Evolve2Digital | Software a medida para PYMEs",
  description:
    "Desarrollo de software a medida, automatización de procesos e integraciones con IA para PYMEs de 10 a 50 empleados. Sin SaaS genérico: tu software, tu negocio.",
  generator: "E2D - Evolve2Digital",
  keywords: ["software a medida", "desarrollo a medida", "ERP a medida", "CRM personalizado", "automatización de procesos", "integración IA empresas", "software para PYMEs"],
  authors: [{ name: PERSON_NAME, url: PERSON_PROFILE_URL }],
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
    images: [
      {
        url: "https://evolve2digital.com/og-head.jpg",
        width: 1200,
        height: 630,
        alt: "Evolve2Digital",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "E2D - Software a medida para PYMEs",
    description: "Desarrollo de software a medida, automatización de procesos e integraciones con IA para PYMEs de 10 a 50 empleados.",
    images: ["https://evolve2digital.com/og-head.jpg"],
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

// Layout raíz de paso: no renderiza <html> porque el `lang` depende del árbol de
// rutas. Cada árbol (app/[locale], app/admin, app/authorize, app/es y
// app/not-found) monta su propio <HtmlDocument>. Es el patrón documentado de
// next-intl para App Router; este archivo conserva `metadata` y los estilos
// globales, que sí son comunes a todos los árboles.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
