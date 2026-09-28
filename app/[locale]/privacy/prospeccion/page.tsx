import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { buildHreflangLanguages } from "@/lib/seo/hreflang"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  AnnexIntroParagraph,
  ResponsableSection,
  DatosSection,
  FinalidadesSection,
} from "@/components/legal/prospecting-annex/annex-intro-sections"
import {
  BaseJuridicaSection,
  DestinatariosSection,
  TransferenciasSection,
} from "@/components/legal/prospecting-annex/annex-recipients-sections"
import {
  ConservacionSection,
  DerechosSection,
} from "@/components/legal/prospecting-annex/annex-retention-rights-sections"

interface ProspeccionPageProps {
  params: Promise<{ locale: string }>
}

const CANONICAL_URL = "https://evolve2digital.com/es/privacy/prospeccion"
const PAGE_TITLE = "Prospección comercial de empresas y profesionales"

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

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <a
              href="/es/privacy"
              className="text-sm text-muted-foreground hover:text-foreground inline-block mb-4"
            >
              ← Política de privacidad
            </a>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Anexo a la política de privacidad
            </p>
            <h1 className="text-4xl font-bold mb-4">{PAGE_TITLE}</h1>
            <p className="text-muted-foreground text-lg">Última actualización: 28 de septiembre de 2026</p>
          </div>

          <Card className="p-6 sm:p-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <AnnexIntroParagraph />
              <ResponsableSection />
              <Separator className="my-8" />
              <DatosSection />
              <Separator className="my-8" />
              <FinalidadesSection />
              <Separator className="my-8" />
              <BaseJuridicaSection />
              <Separator className="my-8" />
              <DestinatariosSection />
              <Separator className="my-8" />
              <TransferenciasSection />
              <Separator className="my-8" />
              <ConservacionSection />
              <Separator className="my-8" />
              <DerechosSection />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
