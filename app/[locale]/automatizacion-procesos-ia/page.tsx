import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/json-ld"
import { PageSchema } from "@/components/seo/page-schema"
import { PageContainer } from "@/components/pages/page-primitives"
import { PageContact } from "@/components/pages/page-contact"
import { SpanishOnlyPage, ensureSpanishLocale } from "@/components/pages/spanish-only-page"
import { AutomationHero } from "@/components/pages/automation/automation-hero"
import { AutomationProcesses, AutomationTools } from "@/components/pages/automation/automation-processes"
import { AutomationExamples } from "@/components/pages/automation/automation-examples"
import {
  AutomationData,
  AutomationHumans,
  AutomationLimits,
  AutomationMaintenance,
} from "@/components/pages/automation/automation-control"
import { AREA_SERVED } from "@/lib/seo/entities"
import { pageBreadcrumb, servicePageNodes } from "@/lib/seo/page-nodes"
import { spanishOnlyMetadata } from "@/lib/seo/static-pages"
import { AGENT_PRICE_PAGES } from "@/lib/showcase/price-pages"

const SLUG = "automatizacion-procesos-ia"
const NAME = "Automatización de procesos con IA"
const TITLE = `${NAME} para empresas | Evolve2Digital`
const DESCRIPTION =
  "Automatización de procesos con IA: leads, emails transaccionales, reservas y pagos, asistentes con tu contenido. Con personas que revisan y límites claros."
const SERVICE_DESCRIPTION =
  "Automatización de procesos con inteligencia artificial: captación de leads, emails transaccionales, reservas y pagos, asistentes con contenido propio y publicación de contenidos."

const RELATED = [
  { href: "/es/desarrollo-software-madrid", text: "Desarrollo de software a medida en Madrid" },
  { href: "/es/alberto-carrasco", text: "Quién soy: perfil de Alberto Carrasco" },
  ...AGENT_PRICE_PAGES.map((page) => ({ href: page.href, text: `Precio de referencia: ${page.name}` })),
]

interface AutomationPageProps {
  params: Promise<{ locale: string }>
}

export function generateMetadata(): Metadata {
  return spanishOnlyMetadata({ slug: SLUG, title: TITLE, description: DESCRIPTION })
}

export default async function AutomationPage({ params }: AutomationPageProps) {
  const { locale } = await params
  ensureSpanishLocale(locale)

  const nodes = servicePageNodes({
    slug: SLUG,
    name: NAME,
    description: SERVICE_DESCRIPTION,
    serviceType: NAME,
    areaServed: AREA_SERVED,
  })

  return (
    <SpanishOnlyPage slug={SLUG}>
      <PageSchema nodes={nodes} />
      <BreadcrumbSchema items={pageBreadcrumb(SLUG, NAME)} />
      <PageContainer>
        <AutomationHero />
        <AutomationProcesses />
        <AutomationTools />
        <AutomationExamples />
        <AutomationData />
        <AutomationHumans />
        <AutomationLimits />
        <AutomationMaintenance />
        <PageContact related={RELATED} />
      </PageContainer>
    </SpanishOnlyPage>
  )
}
