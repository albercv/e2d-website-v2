import type React from "react"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { OrganizationSchema, ServiceSchema, WebsiteSchema } from "@/components/seo/json-ld"
import { CookieBanner } from "@/components/gdpr/cookie-banner"
import { DebugProvider } from "@/components/debug/debug-provider"

const locales = ["es", "en"]

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale)) notFound()

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
      <CookieBanner />
      <DebugProvider />

      <OrganizationSchema locale={locale} />
      <ServiceSchema locale={locale} />
      <WebsiteSchema locale={locale} />
    </NextIntlClientProvider>
  )
}
