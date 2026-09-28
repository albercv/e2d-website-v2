import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { buildHreflangLanguages } from "@/lib/seo/hreflang"
import { prospectingAnnexDocument } from "@/lib/legal/content/prospecting-annex"
import { LegalDocumentView } from "@/components/legal/legal-document"

interface ProspeccionPageProps {
  params: Promise<{ locale: string }>
}

const CANONICAL_URL = "https://evolve2digital.com/es/privacy/prospeccion"
const PAGE_META_TITLE = "Anexo de privacidad: prospección comercial | E2D - Evolve2Digital"
const PAGE_DESCRIPTION =
  "Qué datos públicos de negocios analiza E2D en su prospección comercial, para qué, con qué base jurídica y cómo oponerse."

// Static: the annex only exists in Spanish, so metadata never varies by locale.
export const metadata: Metadata = {
  title: PAGE_META_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: CANONICAL_URL,
    languages: buildHreflangLanguages({ es: CANONICAL_URL }),
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: CANONICAL_URL,
    siteName: "E2D - Evolve2Digital",
    title: PAGE_META_TITLE,
    description: PAGE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function ProspeccionPage({ params }: ProspeccionPageProps) {
  const { locale } = await params

  // en/it never get here: next.config.mjs redirects them to /es. If that
  // redirect is removed, 404 rather than serve Spanish under an en/it URL.
  if (locale !== "es") notFound()

  return <LegalDocumentView document={prospectingAnnexDocument.es} />
}
