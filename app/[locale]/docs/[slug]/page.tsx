import { Navigation } from "@/components/layout/navigation"
import { Footer } from "@/components/layout/footer"
import { DocsNavigation } from "@/components/docs/docs-navigation"
import { DocsContent } from "@/components/docs/docs-content"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface DocsSlugPageProps {
  params: Promise<{ locale: string; slug: string }>
}

const validSlugs = ["principles", "architecture", "components", "i18n", "seo", "gdpr", "performance", "deployment"]

export function generateStaticParams() {
  const locales = ["es", "en"]
  return locales.flatMap((locale) =>
    validSlugs.map((slug) => ({
      locale,
      slug,
    })),
  )
}

export async function generateMetadata({ params }: DocsSlugPageProps): Promise<Metadata> {
  const { locale, slug } = await params

  if (!validSlugs.includes(slug)) {
    return {}
  }

  const titles = {
    es: {
      principles: "Principios de Desarrollo",
      architecture: "Arquitectura del Sistema",
      components: "Guía de Componentes",
      i18n: "Internacionalización",
      seo: "SEO y Metadatos",
      gdpr: "Cumplimiento GDPR",
      performance: "Optimización de Performance",
      deployment: "Despliegue y Producción",
    },
    en: {
      principles: "Development Principles",
      architecture: "System Architecture",
      components: "Components Guide",
      i18n: "Internationalization",
      seo: "SEO and Metadata",
      gdpr: "GDPR Compliance",
      performance: "Performance Optimization",
      deployment: "Deployment and Production",
    },
  }

  const title = titles[locale as keyof typeof titles]?.[slug as keyof typeof titles.es] || slug

  return {
    title: `${title} - E2D Docs`,
    description: `Documentación técnica sobre ${title.toLowerCase()} en el proyecto E2D`,
    alternates: {
      canonical: `/${locale}/docs/${slug}`,
      languages: {
        es: `/es/docs/${slug}`,
        en: `/en/docs/${slug}`,
      },
    },
  }
}

export default async function DocsSlugPage({ params }: DocsSlugPageProps) {
  const { locale, slug } = await params

  if (!validSlugs.includes(slug)) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-16 flex">
        <DocsNavigation locale={locale} activeSlug={slug} />
        <main className="flex-1">
          <DocsContent locale={locale} slug={slug} />
        </main>
      </div>
      <Footer />
    </div>
  )
}
