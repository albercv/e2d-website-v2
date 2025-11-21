import type { Metadata } from "next"
import LegalClientPage from "./LegalClientPage"

interface LegalPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { locale } = await params

  const titles: Record<string, string> = {
    es: "Aviso Legal | E2D - Evolve2Digital",
    en: "Legal Notice | E2D - Evolve2Digital",
    it: "Avviso Legale | E2D - Evolve2Digital",
  }

  const descriptions: Record<string, string> = {
    es: "Aviso legal de E2D. Información sobre términos de uso, responsabilidades y condiciones legales.",
    en: "E2D legal notice. Information about terms of use, responsibilities, and legal conditions.",
    it: "Avviso legale di E2D. Informazioni su termini d'uso, responsabilità e condizioni legali.",
  }

  const baseUrl = "https://evolve2digital.com"
  const ogLocale = locale === "es" ? "es_ES" : locale === "en" ? "en_US" : "it_IT"

  return {
    title: titles[locale] ?? titles.es,
    description: descriptions[locale] ?? descriptions.es,
    alternates: {
      canonical: `${baseUrl}/${locale}/legal`,
      languages: {
        es: `${baseUrl}/es/legal`,
        en: `${baseUrl}/en/legal`,
        it: `${baseUrl}/it/legal`,
      },
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `${baseUrl}/${locale}/legal`,
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
      locale === "es" ? "aviso legal" : locale === "it" ? "avviso legale" : "legal notice",
      "términos",
      "condiciones",
      "responsabilidades",
    ],
  }
}

export default function LegalPage() {
  return <LegalClientPage />
}
