import type { Metadata } from "next"
import { buildHreflangLanguages } from "@/lib/seo/hreflang"
import PrivacyClientPage from "./privacy-client"

interface PrivacyPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params

  const titles: Record<string, string> = {
    es: "Política de Privacidad | E2D - Evolve2Digital",
    en: "Privacy Policy | E2D - Evolve2Digital",
    it: "Informativa sulla Privacy | E2D - Evolve2Digital",
  }

  const descriptions: Record<string, string> = {
    es: "Política de privacidad y protección de datos de E2D. Información sobre el tratamiento de datos personales según GDPR.",
    en: "E2D privacy policy and data protection. Information about processing personal data under GDPR.",
    it: "Informativa sulla privacy e protezione dei dati di E2D. Informazioni sul trattamento dei dati personali secondo il GDPR.",
  }

  const baseUrl = "https://evolve2digital.com"
  const ogLocale = locale === "es" ? "es_ES" : locale === "en" ? "en_US" : "it_IT"

  return {
    title: titles[locale] ?? titles.es,
    description: descriptions[locale] ?? descriptions.es,
    alternates: {
      canonical: `${baseUrl}/${locale}/privacy`,
      languages: buildHreflangLanguages({
        es: `${baseUrl}/es/privacy`,
        en: `${baseUrl}/en/privacy`,
        it: `${baseUrl}/it/privacy`,
      }),
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `${baseUrl}/${locale}/privacy`,
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
      locale === "es" ? "privacidad" : locale === "it" ? "privacy" : "privacy",
      "GDPR",
      locale === "es" ? "protección de datos" : locale === "it" ? "protezione dei dati" : "data protection",
    ],
  }
}

export default function PrivacyPage() {
  return <PrivacyClientPage />
}
