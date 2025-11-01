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
  const locales = ["es", "en", "it"]
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
    it: {
      principles: "Principi di Sviluppo",
      architecture: "Architettura del Sistema",
      components: "Guida ai Componenti",
      i18n: "Internazionalizzazione",
      seo: "SEO e Metadati",
      gdpr: "Conformità GDPR",
      performance: "Ottimizzazione delle Prestazioni",
      deployment: "Distribuzione e Produzione",
    },
  }

  const title = titles[locale as keyof typeof titles]?.[slug as keyof typeof titles.es] || slug

  const descriptions: Record<string, string> = {
    es: `Documentación técnica sobre ${title.toLowerCase()} en el proyecto E2D`,
    en: `Technical documentation about ${title.toLowerCase()} in the E2D project`,
    it: `Documentazione tecnica su ${title.toLowerCase()} nel progetto E2D`,
  }

  return {
    title: `${title} - E2D Docs`,
    description: descriptions[locale] ?? descriptions.es,
    alternates: {
      canonical: `/${locale}/docs/${slug}`,
      languages: {
        es: `/es/docs/${slug}`,
        en: `/en/docs/${slug}`,
        it: `/it/docs/${slug}`,
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
