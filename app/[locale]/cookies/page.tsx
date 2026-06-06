import type { Metadata } from "next"
import { buildHreflangLanguages } from "@/lib/seo/hreflang"
import CookiesClientPage from "./CookiesClientPage"

interface CookiesPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CookiesPageProps): Promise<Metadata> {
  const { locale } = await params

  const titles: Record<string, string> = {
    es: "Política de Cookies | E2D - Evolve2Digital",
    en: "Cookies Policy | E2D - Evolve2Digital",
    it: "Informativa sui Cookie | E2D - Evolve2Digital",
  }

  const descriptions: Record<string, string> = {
    es: "Política de cookies de E2D. Información sobre el uso de cookies y tecnologías similares en nuestro sitio web.",
    en: "E2D cookies policy. Information about the use of cookies and similar technologies on our website.",
    it: "Informativa sui cookie di E2D. Informazioni sull'uso dei cookie e tecnologie simili sul nostro sito web.",
  }

  const baseUrl = "https://evolve2digital.com"
  const ogLocale = locale === "es" ? "es_ES" : locale === "en" ? "en_US" : "it_IT"

  return {
    title: titles[locale] ?? titles.es,
    description: descriptions[locale] ?? descriptions.es,
    alternates: {
      canonical: `${baseUrl}/${locale}/cookies`,
      languages: buildHreflangLanguages({
        es: `${baseUrl}/es/cookies`,
        en: `${baseUrl}/en/cookies`,
        it: `${baseUrl}/it/cookies`,
      }),
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `${baseUrl}/${locale}/cookies`,
      siteName: "E2D - Evolve2Digital",
      title: titles[locale] ?? titles.es,
      description: descriptions[locale] ?? descriptions.es,
    },
    twitter: {
      card: "summary_large_image",
      title: titles[locale] ?? titles.es,
      description: descriptions[locale] ?? descriptions.es,
    },
    robots: {
      index: true,
      follow: true,
    },
    keywords: [
      locale === "es" ? "cookies" : locale === "it" ? "cookie" : "cookies",
      locale === "es" ? "política de cookies" : locale === "it" ? "informativa sui cookie" : "cookies policy",
    ],
  }
}

export default function CookiesPage() {
  return <CookiesClientPage />
}
