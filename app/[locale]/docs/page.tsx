import { Navigation } from "@/components/layout/navigation"
import { Footer } from "@/components/layout/footer"
import { DocsNavigation } from "@/components/docs/docs-navigation"
import { DocsOverview } from "@/components/docs/docs-overview"
import type { Metadata } from "next"

interface DocsPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { locale } = await params

  const baseUrl = "https://evolve2digital.com"
  const ogLocale = locale === "es" ? "es_ES" : locale === "en" ? "en_US" : "it_IT"
  const smeWord = locale === "es" ? "PYME" : locale === "it" ? "PMI" : "SME"

  return {
    title: locale === "es" ? "Documentación - E2D" : "Documentation - E2D",
    description:
      locale === "es"
        ? "Documentación técnica completa del proyecto E2D: arquitectura, componentes, principios y mejores prácticas"
        : "Complete technical documentation for E2D project: architecture, components, principles and best practices",
    alternates: {
      canonical: `${baseUrl}/${locale}/docs`,
      languages: {
        es: `${baseUrl}/es/docs`,
        en: `${baseUrl}/en/docs`,
      },
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `${baseUrl}/${locale}/docs`,
      siteName: "E2D - Evolve2Digital",
      title: locale === "es" ? "Documentación - E2D" : "Documentation - E2D",
      description:
        locale === "es"
          ? "Documentación técnica completa del proyecto E2D: arquitectura, componentes, principios y mejores prácticas"
          : "Complete technical documentation for E2D project: architecture, components, principles and best practices",
    },
    twitter: {
      card: "summary_large_image",
      title: locale === "es" ? "Documentación - E2D" : "Documentation - E2D",
      description:
        locale === "es"
          ? "Documentación técnica completa del proyecto E2D: arquitectura, componentes, principios y mejores prácticas"
          : "Complete technical documentation for E2D project: architecture, components, principles and best practices",
    },
    robots: {
      index: true,
      follow: true,
    },
    keywords: [
      locale === "es" ? "documentación" : locale === "it" ? "documentazione" : "documentation",
      "arquitectura",
      "componentes",
      "principios",
      "mejores prácticas",
      smeWord,
    ],
  }
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { locale } = await params

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-16 flex">
        <DocsNavigation locale={locale} />
        <main className="flex-1">
          <DocsOverview locale={locale} />
        </main>
      </div>
      <Footer />
    </div>
  )
}
