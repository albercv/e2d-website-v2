import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/json-ld"
import { PageSchema } from "@/components/seo/page-schema"
import { PageContainer } from "@/components/pages/page-primitives"
import { PageContact } from "@/components/pages/page-contact"
import { SpanishOnlyPage, ensureSpanishLocale } from "@/components/pages/spanish-only-page"
import { ProfileHero } from "@/components/pages/profile/profile-hero"
import { ProfileSpecialties, ProfileWho } from "@/components/pages/profile/profile-who"
import { ProfileStack } from "@/components/pages/profile/profile-stack"
import { ProfileDeliveredProjects, ProfileOwnProjects } from "@/components/pages/profile/profile-projects"
import { ProfileLinks, ProfileMethod } from "@/components/pages/profile/profile-method"
import { pageBreadcrumb, profilePageNode } from "@/lib/seo/page-nodes"
import { spanishOnlyMetadata } from "@/lib/seo/static-pages"

const SLUG = "alberto-carrasco"
const TITLE = "Alberto Carrasco, desarrollador de software | Evolve2Digital"
const DESCRIPTION =
  "Soy Alberto Carrasco, desarrollador y fundador de Evolve2Digital. Diseño, programo y despliego software a medida, integraciones y automatización con IA."
const NAME = "Alberto Carrasco, desarrollador de software"

interface ProfilePageProps {
  params: Promise<{ locale: string }>
}

export function generateMetadata(): Metadata {
  return spanishOnlyMetadata({ slug: SLUG, title: TITLE, description: DESCRIPTION })
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params
  ensureSpanishLocale(locale)

  return (
    <SpanishOnlyPage slug={SLUG}>
      <PageSchema nodes={[profilePageNode({ slug: SLUG, name: NAME })]} />
      <BreadcrumbSchema items={pageBreadcrumb(SLUG, "Alberto Carrasco")} />
      <PageContainer>
        <ProfileHero />
        <ProfileWho />
        <ProfileSpecialties />
        <ProfileStack />
        <ProfileDeliveredProjects />
        <ProfileOwnProjects />
        <ProfileMethod />
        <ProfileLinks />
        <PageContact related={[]} />
      </PageContainer>
    </SpanishOnlyPage>
  )
}
