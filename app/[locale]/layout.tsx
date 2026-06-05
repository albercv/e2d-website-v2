import type React from "react"
import type { Metadata } from "next"
import { buildHreflangLanguages } from "@/lib/seo/hreflang"
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
    es: "Software a medida para PYMEs | Automatización con IA — E2D",
    en: "Custom software for SMEs | AI automation — E2D",
    it: "Software su misura per PMI | Automazione con IA — E2D",
  } as const

  const descriptionByLocale = {
    es: "Desarrollo de software a medida, automatización de procesos e integraciones con IA para PYMEs de 10 a 50 empleados. Sin SaaS genérico: tu software, tu negocio.",
    en: "Custom software development, process automation and AI integrations for SMEs of 10 to 50 employees. No generic SaaS: your software, your business.",
    it: "Sviluppo di software su misura, automazione dei processi e integrazioni IA per PMI di 10-50 dipendenti. Niente SaaS generico: il tuo software, il tuo business.",
  } as const

  const keywordsByLocale = {
    es: ["software a medida", "desarrollo a medida", "ERP a medida", "CRM personalizado", "automatización de procesos", "integración IA empresas", "software para PYMEs"],
    en: ["custom software development", "bespoke software", "custom ERP", "custom CRM", "process automation", "AI integration", "SME software"],
    it: ["software su misura", "sviluppo su misura", "ERP personalizzato", "CRM personalizzato", "automazione processi", "integrazione IA", "software PMI"],
  } as const

  const ogLocale = locale === "es" ? "es_ES" : locale === "en" ? "en_US" : "it_IT"

  return {
    title: titleByLocale[locale as keyof typeof titleByLocale] ?? titleByLocale.es,
    description: descriptionByLocale[locale as keyof typeof descriptionByLocale] ?? descriptionByLocale.es,
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: buildHreflangLanguages({
        es: `${baseUrl}/es`,
        en: `${baseUrl}/en`,
        it: `${baseUrl}/it`,
      }),
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
    keywords: keywordsByLocale[locale as keyof typeof keywordsByLocale] ?? keywordsByLocale.es,
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
            Evolve2Digital (E2D) desarrolla software a medida e integra IA para PYMEs de 10 a 50 empleados:
            aplicaciones web, ERP/CRM y automatización de procesos. Sin SaaS genérico: tu software, tu negocio.
          </p>
        )}
        {locale === "en" && (
          <p>
            Evolve2Digital (E2D) builds custom software and integrates AI for SMEs of 10 to 50 employees: web apps,
            ERP/CRM and process automation. No generic SaaS: your software, your business.
          </p>
        )}
        {locale === "it" && (
          <p>
            Evolve2Digital (E2D) sviluppa software su misura e integra l’IA per PMI di 10-50 dipendenti: applicazioni
            web, ERP/CRM e automazione dei processi. Niente SaaS generico: il tuo software, il tuo business.
          </p>
        )}
      </noscript>

      <OrganizationSchema locale={locale} />
      <ServiceSchema locale={locale} />
      <WebsiteSchema locale={locale} />
    </NextIntlClientProvider>
  )
}
