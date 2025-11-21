import type React from "react"
import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { notFound } from "next/navigation"
import { OrganizationSchema, ServiceSchema, WebsiteSchema } from "@/components/seo/json-ld"
import { CookieBanner } from "@/components/gdpr/cookie-banner"
import { DebugProvider } from "@/components/debug/debug-provider"

const locales = ["es", "en", "it"]

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export function generateMetadata({ params: { locale } }: { params: { locale: string } }): Metadata {
  const baseUrl = "https://evolve2digital.com"

  const titleByLocale = {
    es: "E2D - Automatiza tu empresa con IA",
    en: "E2D - Automate your business with AI",
    it: "E2D - Automatizza la tua azienda con IA",
  } as const

  const descriptionByLocale = {
    es: "Automatiza tu empresa: más ventas, menos tareas. Agentes de voz, chatbots WhatsApp y automatizaciones para clínicas, inmobiliarias y asesorías.",
    en: "Automate your business: more sales, fewer tasks. Voice agents, WhatsApp chatbots and automations for clinics, real estate and consultancies.",
    it: "Automatizza la tua azienda: più vendite, meno compiti. Voice agent, chatbot WhatsApp e automazioni per cliniche, immobiliare e consulenze.",
  } as const

  const ogLocale = locale === "es" ? "es_ES" : locale === "en" ? "en_US" : "it_IT"
  const smeWord = locale === "es" ? "PYME" : locale === "it" ? "PMI" : "SME"

  return {
    title: titleByLocale[locale as keyof typeof titleByLocale] ?? titleByLocale.es,
    description: descriptionByLocale[locale as keyof typeof descriptionByLocale] ?? descriptionByLocale.es,
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        "es-ES": `${baseUrl}/es`,
        "en-US": `${baseUrl}/en`,
        "it-IT": `${baseUrl}/it`,
      },
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `${baseUrl}/${locale}`,
      siteName: "E2D - Evolve2Digital",
      title: titleByLocale[locale as keyof typeof titleByLocale] ?? titleByLocale.es,
      description: descriptionByLocale[locale as keyof typeof descriptionByLocale] ?? descriptionByLocale.es,
    },
    twitter: {
      card: "summary_large_image",
      title: titleByLocale[locale as keyof typeof titleByLocale] ?? titleByLocale.es,
      description: descriptionByLocale[locale as keyof typeof descriptionByLocale] ?? descriptionByLocale.es,
    },
    robots: {
      index: true,
      follow: true,
    },
    keywords: [
      locale === "es" ? "automatización" : locale === "it" ? "automazione" : "automation",
      "chatbots",
      "WhatsApp",
      "voicebots",
      smeWord,
    ],
  }
}

export default async function LocaleLayout({  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale)) notFound()

  // Explicitly load messages for the active route locale to avoid defaulting to 'es'
  const messages = (await import(`@/messages/${locale}.json`)).default

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
      <CookieBanner />
      <DebugProvider />

      {/* Fallback para navegadores sin JS: resumen del negocio para buscadores */}
      <noscript>
        {locale === "es" && (
          <p>
            Evolve2Digital (E2D) ayuda a PYMEs a automatizar ventas y operaciones con IA: voicebots, chatbots de
            WhatsApp y flujos n8n. Más ventas, menos tareas.
          </p>
        )}
        {locale === "en" && (
          <p>
            Evolve2Digital (E2D) helps SMEs automate sales and operations with AI: voicebots, WhatsApp chatbots and n8n
            flows. More sales, fewer tasks.
          </p>
        )}
        {locale === "it" && (
          <p>
            Evolve2Digital (E2D) aiuta le PMI ad automatizzare vendite e operazioni con l’IA: voicebot, chatbot
            WhatsApp e flussi n8n. Più vendite, meno compiti.
          </p>
        )}
      </noscript>

      <OrganizationSchema locale={locale} />
      <ServiceSchema locale={locale} />
      <WebsiteSchema locale={locale} />
    </NextIntlClientProvider>
  )
}
