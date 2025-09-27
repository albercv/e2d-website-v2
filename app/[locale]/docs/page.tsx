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

  return {
    title: locale === "es" ? "Documentación - E2D" : "Documentation - E2D",
    description:
      locale === "es"
        ? "Documentación técnica completa del proyecto E2D: arquitectura, componentes, principios y mejores prácticas"
        : "Complete technical documentation for E2D project: architecture, components, principles and best practices",
    alternates: {
      canonical: `/${locale}/docs`,
      languages: {
        es: "/es/docs",
        en: "/en/docs",
      },
    },
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
