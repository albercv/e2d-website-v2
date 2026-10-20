import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/json-ld"
import { PageSchema } from "@/components/seo/page-schema"
import { PageContainer } from "@/components/pages/page-primitives"
import { PageContact } from "@/components/pages/page-contact"
import { SpanishOnlyPage, ensureSpanishLocale } from "@/components/pages/spanish-only-page"
import { SoftwareHero } from "@/components/pages/software/software-hero"
import { SoftwareProblems, SoftwareProjectTypes } from "@/components/pages/software/software-scope"
import { SoftwareIntegrations, SoftwareProcess } from "@/components/pages/software/software-process"
import { SoftwareBudget } from "@/components/pages/software/software-budget"
import { SoftwareExamples } from "@/components/pages/software/software-examples"
import { SoftwareLocation, SoftwareMaintenance } from "@/components/pages/software/software-maintenance"
import { pageBreadcrumb, servicePageNodes } from "@/lib/seo/page-nodes"
import { spanishOnlyMetadata } from "@/lib/seo/static-pages"

const SLUG = "desarrollo-software-madrid"
const NAME = "Desarrollo de software a medida en Madrid"
const TITLE = `${NAME} | Evolve2Digital`
const DESCRIPTION =
  "Software a medida para empresas de Madrid y de toda España, en remoto: análisis, propuesta escrita con alcance y presupuesto, desarrollo por entregas y mantenimiento."
const SERVICE_DESCRIPTION =
  "Desarrollo de software a medida para empresas de la Comunidad de Madrid y del resto de España, en remoto."

// Madrid is where the work is done from and a market served, not an office:
// the Service names the Comunidad de Madrid as an area and publishes no address.
const AREA_SERVED = [{ "@type": "AdministrativeArea", name: "Comunidad de Madrid" }, "ES"]

const RELATED = [
  { href: "/es/automatizacion-procesos-ia", text: "Automatización de procesos con IA" },
  { href: "/es/alberto-carrasco", text: "Quién soy: perfil de Alberto Carrasco" },
]

interface SoftwarePageProps {
  params: Promise<{ locale: string }>
}

export function generateMetadata(): Metadata {
  return spanishOnlyMetadata({ slug: SLUG, title: TITLE, description: DESCRIPTION })
}

export default async function SoftwarePage({ params }: SoftwarePageProps) {
  const { locale } = await params
  ensureSpanishLocale(locale)

  const nodes = servicePageNodes({
    slug: SLUG,
    name: NAME,
    description: SERVICE_DESCRIPTION,
    serviceType: "Desarrollo de software a medida",
    areaServed: AREA_SERVED,
  })

  return (
    <SpanishOnlyPage slug={SLUG}>
      <PageSchema nodes={nodes} />
      <BreadcrumbSchema items={pageBreadcrumb(SLUG, NAME)} />
      <PageContainer>
        <SoftwareHero />
        <SoftwareProblems />
        <SoftwareProjectTypes />
        <SoftwareProcess />
        <SoftwareIntegrations />
        <SoftwareBudget />
        <SoftwareExamples />
        <SoftwareMaintenance />
        <SoftwareLocation />
        <PageContact related={RELATED} />
      </PageContainer>
    </SpanishOnlyPage>
  )
}
