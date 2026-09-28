import type { Metadata } from "next"
import { buildHreflangLanguages } from "@/lib/seo/hreflang"
import { prospectingAnnexDocument } from "@/lib/legal/content/prospecting-annex"
import { getLegalDocument } from "@/lib/legal/get-document"
import { LegalDocumentView } from "@/components/legal/legal-document"

interface ProspeccionPageProps {
  params: Promise<{ locale: string }>
}

const BASE_URL = "https://evolve2digital.com"

const TITLES: Record<string, string> = {
  es: "Anexo de privacidad: prospección comercial | E2D - Evolve2Digital",
  en: "Privacy annex: commercial prospecting | E2D - Evolve2Digital",
  it: "Allegato privacy: prospezione commerciale | E2D - Evolve2Digital",
}

const DESCRIPTIONS: Record<string, string> = {
  es: "Qué datos públicos de negocios analiza E2D en su prospección comercial, para qué, con qué base jurídica y cómo oponerse.",
  en: "What public business data E2D analyzes for commercial prospecting, why, on what legal basis and how to object.",
  it: "Quali dati pubblici delle attività analizza E2D per la prospezione commerciale, per quali finalità, su quale base giuridica e come opporsi.",
}

export async function generateMetadata({ params }: ProspeccionPageProps): Promise<Metadata> {
  const { locale } = await params
  const ogLocale = locale === "es" ? "es_ES" : locale === "en" ? "en_US" : "it_IT"
  const url = `${BASE_URL}/${locale}/privacy/prospeccion`

  return {
    title: TITLES[locale] ?? TITLES.es,
    description: DESCRIPTIONS[locale] ?? DESCRIPTIONS.es,
    alternates: {
      canonical: url,
      languages: buildHreflangLanguages({
        es: `${BASE_URL}/es/privacy/prospeccion`,
        en: `${BASE_URL}/en/privacy/prospeccion`,
        it: `${BASE_URL}/it/privacy/prospeccion`,
      }),
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url,
      siteName: "E2D - Evolve2Digital",
      title: TITLES[locale] ?? TITLES.es,
      description: DESCRIPTIONS[locale] ?? DESCRIPTIONS.es,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function ProspeccionPage({ params }: ProspeccionPageProps) {
  const { locale } = await params
  const document = getLegalDocument(prospectingAnnexDocument, locale)
  return <LegalDocumentView document={document} />
}
